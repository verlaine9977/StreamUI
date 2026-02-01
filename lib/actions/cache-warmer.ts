"use server";

import { db } from "@/lib/db";
import { cacheWarmerJobs, favorites, watchProgress, userAccounts, addons } from "@/lib/db/schema";
import { getSession, SINGLE_USER } from "@/lib/auth";
import { eq, and, desc, or } from "drizzle-orm";
import { AddonClient } from "@/lib/addons/client";
import { parseStreams } from "@/lib/addons/parser";
import { getClient, getClientInstance } from "@/lib/clients";
import { type AddonSource } from "@/lib/addons/types";
import type { CacheWarmerJob, WatchProgress } from "@/lib/db/schema";

export interface CacheWarmerConfig {
    profileId: string;
    includeNextEpisodes: boolean;
    includeFavorites: boolean;
    preferUsenet: boolean; // Try Usenet sources first
    maxConcurrent: number;
}

export interface CacheWarmerProgress {
    total: number;
    completed: number;
    cached: number;
    failed: number;
    inProgress: number;
    pending: number;
}

/**
 * Get items to cache warm (favorites + next episodes from continue watching)
 */
export async function getCacheWarmerItems(profileId: string) {
    const session = await getSession();
    if (!session) return { favorites: [], nextEpisodes: [] };

    // Get favorites
    const favs = await db
        .select()
        .from(favorites)
        .where(eq(favorites.profileId, profileId))
        .orderBy(desc(favorites.createdAt));

    // Get continue watching to determine next episodes
    const continueWatching = await db
        .select()
        .from(watchProgress)
        .where(
            and(
                eq(watchProgress.profileId, profileId),
                eq(watchProgress.mediaType, "show"),
                eq(watchProgress.completed, false)
            )
        )
        .orderBy(desc(watchProgress.watchedAt));

    // Determine next episodes for each show
    const nextEpisodes: Array<{
        imdbId: string;
        title: string;
        season: number;
        episode: number;
    }> = [];

    // Group by show and get the most recent episode for each
    const showProgress = new Map<string, WatchProgress>();
    for (const wp of continueWatching) {
        if (!showProgress.has(wp.imdbId)) {
            showProgress.set(wp.imdbId, wp);
        }
    }

    // For each show, get the next 2 episodes
    for (const [imdbId, wp] of showProgress) {
        if (wp.season && wp.episode) {
            // Add next episode (current + 1)
            nextEpisodes.push({
                imdbId,
                title: wp.title,
                season: wp.season,
                episode: wp.episode + 1,
            });
            // Add episode after next (current + 2)
            nextEpisodes.push({
                imdbId,
                title: wp.title,
                season: wp.season,
                episode: wp.episode + 2,
            });
        }
    }

    return { favorites: favs, nextEpisodes };
}

/**
 * Get existing cache warmer jobs for a profile
 */
export async function getCacheWarmerJobs(profileId: string | null): Promise<CacheWarmerJob[]> {
    const session = await getSession();
    if (!session) return [];

    const whereClause = profileId
        ? and(eq(cacheWarmerJobs.userId, SINGLE_USER.id), eq(cacheWarmerJobs.profileId, profileId))
        : eq(cacheWarmerJobs.userId, SINGLE_USER.id);

    return db
        .select()
        .from(cacheWarmerJobs)
        .where(whereClause)
        .orderBy(desc(cacheWarmerJobs.createdAt))
        .limit(100);
}

/**
 * Get cache warmer progress
 */
export async function getCacheWarmerProgress(profileId: string | null): Promise<CacheWarmerProgress> {
    const jobs = await getCacheWarmerJobs(profileId);

    return {
        total: jobs.length,
        completed: jobs.filter(j => j.status === "cached" || j.status === "failed" || j.status === "not_found").length,
        cached: jobs.filter(j => j.status === "cached").length,
        failed: jobs.filter(j => j.status === "failed").length,
        inProgress: jobs.filter(j => j.status === "searching" || j.status === "caching").length,
        pending: jobs.filter(j => j.status === "pending").length,
    };
}

/**
 * Create cache warmer jobs for favorites and next episodes
 */
export async function createCacheWarmerJobs(config: CacheWarmerConfig): Promise<{ created: number }> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const { favorites: favs, nextEpisodes } = await getCacheWarmerItems(config.profileId);

    const jobsToCreate: Array<{
        userId: string;
        profileId: string;
        mediaType: "movie" | "show";
        imdbId: string;
        title: string;
        season?: number;
        episode?: number;
    }> = [];

    // Add favorites (only movies - shows need episode info from Continue Watching)
    if (config.includeFavorites) {
        for (const fav of favs) {
            // Only cache movies from favorites - shows require episode info
            if (fav.mediaType === "movie") {
                jobsToCreate.push({
                    userId: SINGLE_USER.id,
                    profileId: config.profileId,
                    mediaType: "movie",
                    imdbId: fav.imdbId,
                    title: fav.title,
                });
            }
        }
    }

    // Add next episodes
    if (config.includeNextEpisodes) {
        for (const ep of nextEpisodes) {
            jobsToCreate.push({
                userId: SINGLE_USER.id,
                profileId: config.profileId,
                mediaType: "show",
                imdbId: ep.imdbId,
                title: ep.title,
                season: ep.season,
                episode: ep.episode,
            });
        }
    }

    if (jobsToCreate.length === 0) {
        return { created: 0 };
    }

    // Use INSERT ... ON CONFLICT DO NOTHING to avoid duplicates
    let created = 0;
    for (const job of jobsToCreate) {
        try {
            await db
                .insert(cacheWarmerJobs)
                .values(job)
                .onConflictDoNothing();
            created++;
        } catch {
            // Ignore duplicate key errors
        }
    }

    return { created };
}

/**
 * Trigger a stream URL to start caching (for Usenet and other URL-based sources)
 * Makes a request to the URL which triggers the download/caching process
 * Uses browser-like headers to avoid bot detection
 */
async function triggerStreamCache(url: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Make a request to trigger the stream/download
        // Use AbortController to timeout after 60 seconds (usenet needs time to submit NZB and check files)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            headers: {
                // Use browser-like User-Agent
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.9",
                // Request just the first byte to trigger the download without waiting for full stream
                "Range": "bytes=0-1",
            },
        });

        clearTimeout(timeoutId);

        // 200, 206 (partial content), 307 (redirect to personal file), or even 416 (range not satisfiable yet) are all OK
        // They indicate the server accepted the request and started processing
        if (response.ok || response.status === 206 || response.status === 307 || response.status === 416) {
            return { success: true };
        }

        // Get error body for better debugging
        let errorBody = "";
        try {
            errorBody = await response.text();
            if (errorBody.length > 200) {
                errorBody = errorBody.substring(0, 200) + "...";
            }
        } catch {
            // Ignore body read errors
        }

        return { success: false, error: `HTTP ${response.status}: ${errorBody || response.statusText}` };
    } catch (error) {
        // AbortError means we timed out, but the request was initiated
        if (error instanceof Error && error.name === "AbortError") {
            return { success: true }; // Request was sent, download should be starting
        }
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
}

/**
 * Process a single cache warmer job
 * Prefers Usenet/URL sources (trigger stream to cache) over torrent magnets
 */
export async function processCacheWarmerJob(jobId: string): Promise<CacheWarmerJob | null> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    // Get the job
    const [job] = await db
        .select()
        .from(cacheWarmerJobs)
        .where(and(eq(cacheWarmerJobs.id, jobId), eq(cacheWarmerJobs.userId, SINGLE_USER.id)))
        .limit(1);

    if (!job) {
        throw new Error("Job not found");
    }

    // For TV shows, we need season and episode info
    if (job.mediaType === "show" && (!job.season || !job.episode)) {
        await db
            .update(cacheWarmerJobs)
            .set({
                status: "failed",
                errorMessage: "TV shows require season/episode info. Use 'Next Episodes' from Continue Watching.",
                updatedAt: new Date(),
                completedAt: new Date()
            })
            .where(eq(cacheWarmerJobs.id, jobId));
        return null;
    }

    // Update status to searching
    await db
        .update(cacheWarmerJobs)
        .set({ status: "searching", updatedAt: new Date() })
        .where(eq(cacheWarmerJobs.id, jobId));

    try {
        // Get user's enabled addons
        const userAddons = await db
            .select()
            .from(addons)
            .where(and(eq(addons.userId, SINGLE_USER.id), eq(addons.enabled, true)))
            .orderBy(addons.order);

        if (userAddons.length === 0) {
            await db
                .update(cacheWarmerJobs)
                .set({ status: "failed", errorMessage: "No addons configured", updatedAt: new Date(), completedAt: new Date() })
                .where(eq(cacheWarmerJobs.id, jobId));
            return null;
        }

        // Search for sources across all addons
        const allSources: AddonSource[] = [];
        const addonErrors: string[] = [];

        for (const addon of userAddons) {
            try {
                const client = new AddonClient({ url: addon.url });
                const tvParams = job.mediaType === "show" && job.season && job.episode
                    ? { season: job.season, episode: job.episode }
                    : undefined;

                const response = await client.fetchStreams(job.imdbId, job.mediaType, tvParams);
                const sources = parseStreams(response.streams, addon.id, addon.name);
                allSources.push(...sources);
            } catch (err) {
                // Track addon errors for debugging
                addonErrors.push(`${addon.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
        }

        if (allSources.length === 0) {
            const errorMsg = addonErrors.length > 0
                ? `No sources found. Addon errors: ${addonErrors.join("; ")}`
                : "No sources found from any addon";
            await db
                .update(cacheWarmerJobs)
                .set({ status: "not_found", errorMessage: errorMsg, updatedAt: new Date(), completedAt: new Date() })
                .where(eq(cacheWarmerJobs.id, jobId));
            return null;
        }

        // Sort sources:
        // 1. Usenet URLs first (for instant streaming)
        // 2. Then cached sources
        // 3. Then by resolution (higher first)
        const sortedSources = allSources.sort((a, b) => {
            // Usenet URLs first (contain /usenet/ in the URL)
            const aIsUsenet = a.url?.includes("/usenet/") ?? false;
            const bIsUsenet = b.url?.includes("/usenet/") ?? false;
            if (aIsUsenet && !bIsUsenet) return -1;
            if (!aIsUsenet && bIsUsenet) return 1;

            // Then sources with URLs (can be cached by triggering)
            const aHasUrl = !!a.url;
            const bHasUrl = !!b.url;
            if (aHasUrl && !bHasUrl) return -1;
            if (!aHasUrl && bHasUrl) return 1;

            // Cached first
            if (a.isCached && !b.isCached) return -1;
            if (!a.isCached && b.isCached) return 1;

            // Then by resolution (higher first)
            const resOrder: Record<string, number> = { "2160p": 4, "1080p": 3, "720p": 2, "480p": 1 };
            const aRes = resOrder[a.resolution || ""] || 0;
            const bRes = resOrder[b.resolution || ""] || 0;
            return bRes - aRes;
        });

        // Try URL-based sources first (Usenet, etc.)
        const sourceWithUrl = sortedSources.find(s => s.url);
        let urlError: string | undefined;

        if (sourceWithUrl?.url) {
            const isUsenet = sourceWithUrl.url.includes("/usenet/");

            // Update status to caching
            await db
                .update(cacheWarmerJobs)
                .set({
                    status: "caching",
                    source: isUsenet ? "usenet" : "stream",
                    sourceUrl: sourceWithUrl.url,
                    updatedAt: new Date()
                })
                .where(eq(cacheWarmerJobs.id, jobId));

            // Trigger the stream URL to start caching
            const result = await triggerStreamCache(sourceWithUrl.url);

            if (result.success) {
                // Successfully triggered caching
                await db
                    .update(cacheWarmerJobs)
                    .set({
                        status: "cached",
                        debridService: isUsenet ? "usenet" : "stream",
                        updatedAt: new Date(),
                        completedAt: new Date()
                    })
                    .where(eq(cacheWarmerJobs.id, jobId));

                const [updatedJob] = await db
                    .select()
                    .from(cacheWarmerJobs)
                    .where(eq(cacheWarmerJobs.id, jobId))
                    .limit(1);

                return updatedJob;
            }
            // Store error and try magnet fallback
            urlError = result.error;
        }

        // Fall back to magnet/torrent if no URL sources worked
        const sourceWithMagnet = sortedSources.find(s => s.magnet);

        if (!sourceWithMagnet?.magnet) {
            // Build error message with all context
            const errorParts: string[] = [];
            if (sourceWithUrl && urlError) {
                errorParts.push(`URL fetch failed: ${urlError}`);
            }
            errorParts.push("No magnet links available as fallback");
            if (addonErrors.length > 0) {
                errorParts.push(`Addon errors: ${addonErrors.join("; ")}`);
            }

            await db
                .update(cacheWarmerJobs)
                .set({
                    status: "failed",
                    errorMessage: errorParts.join(". "),
                    updatedAt: new Date(),
                    completedAt: new Date()
                })
                .where(eq(cacheWarmerJobs.id, jobId));
            return null;
        }

        // Get user's debrid accounts for torrent caching
        const accounts = await db
            .select()
            .from(userAccounts)
            .where(eq(userAccounts.userId, SINGLE_USER.id));

        if (accounts.length === 0) {
            await db
                .update(cacheWarmerJobs)
                .set({ status: "failed", errorMessage: "No debrid accounts configured for torrent caching", updatedAt: new Date() })
                .where(eq(cacheWarmerJobs.id, jobId));
            return null;
        }

        // Update status to caching
        await db
            .update(cacheWarmerJobs)
            .set({
                status: "caching",
                source: "torrent",
                sourceUrl: sourceWithMagnet.magnet,
                updatedAt: new Date()
            })
            .where(eq(cacheWarmerJobs.id, jobId));

        // Add to the first available debrid service
        const account = accounts[0];

        // Get user info from the debrid service to create a full User object
        const ClientClass = getClient({ type: account.type });
        const userInfo = await ClientClass.getUser(account.apiKey);
        const debridClient = getClientInstance(userInfo);

        const result = await debridClient.addTorrent([sourceWithMagnet.magnet]);
        const addResult = result[sourceWithMagnet.magnet];

        if (addResult?.error) {
            await db
                .update(cacheWarmerJobs)
                .set({
                    status: "failed",
                    errorMessage: addResult.error,
                    debridService: account.type,
                    updatedAt: new Date(),
                    completedAt: new Date()
                })
                .where(eq(cacheWarmerJobs.id, jobId));
            return null;
        }

        // Successfully added/cached
        await db
            .update(cacheWarmerJobs)
            .set({
                status: "cached",
                debridService: account.type,
                debridFileId: addResult?.id?.toString(),
                updatedAt: new Date(),
                completedAt: new Date()
            })
            .where(eq(cacheWarmerJobs.id, jobId));

        // Return updated job
        const [updatedJob] = await db
            .select()
            .from(cacheWarmerJobs)
            .where(eq(cacheWarmerJobs.id, jobId))
            .limit(1);

        return updatedJob;
    } catch (error) {
        await db
            .update(cacheWarmerJobs)
            .set({
                status: "failed",
                errorMessage: error instanceof Error ? error.message : "Unknown error",
                updatedAt: new Date(),
                completedAt: new Date()
            })
            .where(eq(cacheWarmerJobs.id, jobId));
        return null;
    }
}

/**
 * Process all pending cache warmer jobs (limited batch)
 */
export async function processPendingCacheWarmerJobs(limit = 5): Promise<{ processed: number; cached: number; failed: number }> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    // Get pending jobs
    const pendingJobs = await db
        .select()
        .from(cacheWarmerJobs)
        .where(
            and(
                eq(cacheWarmerJobs.userId, SINGLE_USER.id),
                eq(cacheWarmerJobs.status, "pending")
            )
        )
        .orderBy(cacheWarmerJobs.createdAt)
        .limit(limit);

    let processed = 0;
    let cached = 0;
    let failed = 0;

    for (const job of pendingJobs) {
        processed++;
        const result = await processCacheWarmerJob(job.id);
        if (result?.status === "cached") {
            cached++;
        } else {
            failed++;
        }
    }

    return { processed, cached, failed };
}

/**
 * Clear completed/failed cache warmer jobs
 */
export async function clearCacheWarmerJobs(profileId?: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const whereConditions = [
        eq(cacheWarmerJobs.userId, SINGLE_USER.id),
        or(
            eq(cacheWarmerJobs.status, "cached"),
            eq(cacheWarmerJobs.status, "failed"),
            eq(cacheWarmerJobs.status, "not_found")
        )
    ];

    if (profileId) {
        whereConditions.push(eq(cacheWarmerJobs.profileId, profileId));
    }

    await db
        .delete(cacheWarmerJobs)
        .where(and(...whereConditions));
}

/**
 * Delete a specific cache warmer job
 */
export async function deleteCacheWarmerJob(jobId: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    await db
        .delete(cacheWarmerJobs)
        .where(and(eq(cacheWarmerJobs.id, jobId), eq(cacheWarmerJobs.userId, SINGLE_USER.id)));
}
