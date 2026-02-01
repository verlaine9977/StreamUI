"use server";

import { db } from "@/lib/db";
import { profiles, watchProgress, favorites, type Profile, type WatchProgress, type Favorite } from "@/lib/db/schema";
import { getSession, SINGLE_USER } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PROFILE_COLORS, PROFILE_AVATARS, MAX_PROFILES } from "@/lib/constants/profiles";

export async function getProfiles(): Promise<Profile[]> {
    const session = await getSession();
    if (!session) return [];

    return db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, SINGLE_USER.id))
        .orderBy(profiles.createdAt);
}

export async function getProfile(profileId: string): Promise<Profile | null> {
    const session = await getSession();
    if (!session) return null;

    const result = await db
        .select()
        .from(profiles)
        .where(and(eq(profiles.id, profileId), eq(profiles.userId, SINGLE_USER.id)))
        .limit(1);

    return result[0] || null;
}

export async function createProfile(data: { name: string; avatar?: string; color?: string; maxAgeRating?: number | null }): Promise<Profile> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    // Check profile limit
    const existingProfiles = await getProfiles();
    if (existingProfiles.length >= MAX_PROFILES) {
        throw new Error(`Maximum ${MAX_PROFILES} profiles allowed`);
    }

    const isFirst = existingProfiles.length === 0;

    const [profile] = await db
        .insert(profiles)
        .values({
            userId: SINGLE_USER.id,
            name: data.name,
            avatar: data.avatar || PROFILE_AVATARS[0],
            color: data.color || PROFILE_COLORS[existingProfiles.length % PROFILE_COLORS.length],
            isDefault: isFirst,
            maxAgeRating: data.maxAgeRating,
        })
        .returning();

    revalidatePath("/profiles");
    return profile;
}

export async function updateProfile(
    profileId: string,
    data: { name?: string; avatar?: string; color?: string; maxAgeRating?: number | null }
): Promise<Profile> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const [profile] = await db
        .update(profiles)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(and(eq(profiles.id, profileId), eq(profiles.userId, SINGLE_USER.id)))
        .returning();

    if (!profile) throw new Error("Profile not found");

    revalidatePath("/profiles");
    return profile;
}

export async function deleteProfile(profileId: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    // Don't allow deleting the last profile
    const existingProfiles = await getProfiles();
    if (existingProfiles.length <= 1) {
        throw new Error("Cannot delete the last profile");
    }

    const profile = existingProfiles.find((p) => p.id === profileId);
    if (!profile) throw new Error("Profile not found");

    await db.delete(profiles).where(eq(profiles.id, profileId));

    // If deleted profile was default, make another one default
    if (profile.isDefault) {
        const remaining = existingProfiles.filter((p) => p.id !== profileId);
        if (remaining.length > 0) {
            await db
                .update(profiles)
                .set({ isDefault: true })
                .where(eq(profiles.id, remaining[0].id));
        }
    }

    revalidatePath("/profiles");
}

export async function setDefaultProfile(profileId: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    // Unset all defaults
    await db
        .update(profiles)
        .set({ isDefault: false })
        .where(eq(profiles.userId, SINGLE_USER.id));

    // Set new default
    await db
        .update(profiles)
        .set({ isDefault: true })
        .where(and(eq(profiles.id, profileId), eq(profiles.userId, SINGLE_USER.id)));

    revalidatePath("/profiles");
}

// Trakt OAuth functions
export async function updateProfileTraktTokens(
    profileId: string,
    tokens: {
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        username?: string;
    }
): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    await db
        .update(profiles)
        .set({
            traktAccessToken: tokens.accessToken,
            traktRefreshToken: tokens.refreshToken,
            traktExpiresAt: tokens.expiresAt,
            traktUsername: tokens.username,
            updatedAt: new Date(),
        })
        .where(and(eq(profiles.id, profileId), eq(profiles.userId, SINGLE_USER.id)));

    revalidatePath("/profiles");
}

export async function disconnectProfileTrakt(profileId: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    await db
        .update(profiles)
        .set({
            traktAccessToken: null,
            traktRefreshToken: null,
            traktExpiresAt: null,
            traktUsername: null,
            updatedAt: new Date(),
        })
        .where(and(eq(profiles.id, profileId), eq(profiles.userId, SINGLE_USER.id)));

    revalidatePath("/profiles");
}

// Watch Progress functions
export async function updateWatchProgress(
    profileId: string,
    data: {
        mediaType: "movie" | "show";
        imdbId: string;
        tmdbId?: number;
        title: string;
        posterUrl?: string;
        season?: number;
        episode?: number;
        episodeTitle?: string;
        progress: number;
        duration?: number;
    }
): Promise<WatchProgress> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const completed = data.progress >= 90;

    // The unique index uses COALESCE(season, -1), COALESCE(episode, -1)
    // So we need to do manual check + insert/update instead of ON CONFLICT
    // because Drizzle can't target expression-based indexes

    // Build the where clause based on media type
    const whereConditions = data.mediaType === "movie"
        ? and(
            eq(watchProgress.profileId, profileId),
            eq(watchProgress.imdbId, data.imdbId),
            eq(watchProgress.mediaType, "movie")
        )
        : and(
            eq(watchProgress.profileId, profileId),
            eq(watchProgress.imdbId, data.imdbId),
            eq(watchProgress.season, data.season!),
            eq(watchProgress.episode, data.episode!)
        );

    // Check if record exists
    const existing = await db
        .select()
        .from(watchProgress)
        .where(whereConditions)
        .limit(1);

    let result: WatchProgress;

    if (existing.length > 0) {
        // Update existing record
        const [updated] = await db
            .update(watchProgress)
            .set({
                progress: data.progress,
                duration: data.duration,
                completed,
                watchedAt: new Date(),
                posterUrl: data.posterUrl,
                episodeTitle: data.episodeTitle,
            })
            .where(eq(watchProgress.id, existing[0].id))
            .returning();
        result = updated;
    } else {
        // Insert new record
        const [inserted] = await db
            .insert(watchProgress)
            .values({
                profileId,
                mediaType: data.mediaType,
                imdbId: data.imdbId,
                tmdbId: data.tmdbId,
                title: data.title,
                posterUrl: data.posterUrl,
                season: data.season,
                episode: data.episode,
                episodeTitle: data.episodeTitle,
                progress: data.progress,
                duration: data.duration,
                completed,
                watchedAt: new Date(),
            })
            .returning();
        result = inserted;
    }

    // For TV shows: when episode is completed, create entry for next episode
    // This ensures "continue watching" shows the next episode
    if (completed && data.mediaType === "show" && data.season && data.episode) {
        const nextEpisode = data.episode + 1;

        // Check if next episode entry already exists
        const nextExists = await db
            .select()
            .from(watchProgress)
            .where(
                and(
                    eq(watchProgress.profileId, profileId),
                    eq(watchProgress.imdbId, data.imdbId),
                    eq(watchProgress.season, data.season),
                    eq(watchProgress.episode, nextEpisode)
                )
            )
            .limit(1);

        // Only create if next episode doesn't exist
        if (nextExists.length === 0) {
            await db.insert(watchProgress).values({
                profileId,
                mediaType: "show",
                imdbId: data.imdbId,
                tmdbId: data.tmdbId,
                title: data.title,
                posterUrl: data.posterUrl,
                season: data.season,
                episode: nextEpisode,
                episodeTitle: undefined, // Will be updated when they actually watch
                progress: 0,
                completed: false,
                watchedAt: new Date(),
            });
        }
    }

    return result;
}

export async function getContinueWatching(profileId: string, limit = 10): Promise<WatchProgress[]> {
    const session = await getSession();
    if (!session) return [];

    return db
        .select()
        .from(watchProgress)
        .where(and(eq(watchProgress.profileId, profileId), eq(watchProgress.completed, false)))
        .orderBy(desc(watchProgress.watchedAt))
        .limit(limit);
}

export async function getWatchHistory(profileId: string, limit = 50): Promise<WatchProgress[]> {
    const session = await getSession();
    if (!session) return [];

    return db
        .select()
        .from(watchProgress)
        .where(eq(watchProgress.profileId, profileId))
        .orderBy(desc(watchProgress.watchedAt))
        .limit(limit);
}

export async function removeFromWatchProgress(profileId: string, imdbId: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    await db
        .delete(watchProgress)
        .where(and(eq(watchProgress.profileId, profileId), eq(watchProgress.imdbId, imdbId)));
}

export async function getShowWatchProgress(profileId: string, imdbId: string): Promise<WatchProgress[]> {
    const session = await getSession();
    if (!session) return [];

    return db
        .select()
        .from(watchProgress)
        .where(
            and(
                eq(watchProgress.profileId, profileId),
                eq(watchProgress.imdbId, imdbId),
                eq(watchProgress.mediaType, "show")
            )
        )
        .orderBy(desc(watchProgress.watchedAt));
}

// Favorites functions
export async function addToFavorites(
    profileId: string,
    data: {
        mediaType: "movie" | "show";
        imdbId: string;
        tmdbId?: number;
        traktId?: number;
        title: string;
        year?: number;
        posterUrl?: string;
        slug?: string;
    }
): Promise<Favorite> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    // Check if already favorited
    const existing = await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.profileId, profileId), eq(favorites.imdbId, data.imdbId)))
        .limit(1);

    if (existing.length > 0) {
        return existing[0];
    }

    const [favorite] = await db
        .insert(favorites)
        .values({
            profileId,
            mediaType: data.mediaType,
            imdbId: data.imdbId,
            tmdbId: data.tmdbId,
            traktId: data.traktId,
            title: data.title,
            year: data.year,
            posterUrl: data.posterUrl,
            slug: data.slug,
        })
        .returning();

    return favorite;
}

export async function removeFromFavorites(profileId: string, imdbId: string): Promise<void> {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    await db
        .delete(favorites)
        .where(and(eq(favorites.profileId, profileId), eq(favorites.imdbId, imdbId)));
}

export async function getFavorites(profileId: string, limit = 50): Promise<Favorite[]> {
    const session = await getSession();
    if (!session) return [];

    return db
        .select()
        .from(favorites)
        .where(eq(favorites.profileId, profileId))
        .orderBy(desc(favorites.createdAt))
        .limit(limit);
}

export async function isFavorite(profileId: string, imdbId: string): Promise<boolean> {
    const session = await getSession();
    if (!session) return false;

    const result = await db
        .select()
        .from(favorites)
        .where(and(eq(favorites.profileId, profileId), eq(favorites.imdbId, imdbId)))
        .limit(1);

    return result.length > 0;
}
