import { NextRequest, NextResponse } from "next/server";
import { TraktClient } from "@/lib/trakt";
import { wrapDocument, escapeXml, generateAlertTemplate, getPosterUrl, getFanartUrl } from "@/lib/tvos/tvml";
import { db } from "@/lib/db";
import { addons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SINGLE_USER } from "@/lib/auth";
import { AddonClient } from "@/lib/addons/client";
import { parseStream } from "@/lib/addons/parser";

const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    // Get the actual public URL from forwarded headers
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;

    if (!TRAKT_CLIENT_ID) {
        const tvml = generateAlertTemplate(
            "Configuration Error",
            "Trakt client ID not configured."
        );
        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
        });
    }

    try {
        // Get movie info from Trakt
        const trakt = new TraktClient({
            clientId: TRAKT_CLIENT_ID,
            baseUrl: "https://api.trakt.tv",
        });

        const movie = await trakt.getMovie(slug);
        const imdbId = movie.ids?.imdb;

        if (!imdbId) {
            const tvml = generateAlertTemplate(
                "Error",
                "No IMDB ID found for this movie."
            );
            return new NextResponse(tvml, {
                headers: { "Content-Type": "application/xml" },
            });
        }

        // Get user's enabled addons
        const userAddons = await db
            .select()
            .from(addons)
            .where(eq(addons.userId, SINGLE_USER.id))
            .orderBy(addons.order);

        const enabledAddons = userAddons.filter(a => a.enabled);

        if (enabledAddons.length === 0) {
            const tvml = generateAlertTemplate(
                "No Addons Configured",
                "Please add Stremio addons in the StreamUI web app to get sources."
            );
            return new NextResponse(tvml, {
                headers: { "Content-Type": "application/xml" },
            });
        }

        // Fetch streams from all enabled addons in parallel
        const allStreams: Array<{ name: string; url: string; quality?: string; size?: string; addon: string }> = [];

        await Promise.all(
            enabledAddons.map(async (addon) => {
                try {
                    const client = new AddonClient({ url: addon.url, timeout: 15000 });
                    const response = await client.fetchMovieStreams(imdbId);

                    for (const stream of response.streams || []) {
                        const parsed = parseStream(stream, addon.id, addon.name);
                        // Only include streams with HTTP URLs (not magnet links)
                        const streamUrl = parsed.url || stream.url;
                        if (streamUrl && (streamUrl.startsWith("http://") || streamUrl.startsWith("https://"))) {
                            allStreams.push({
                                name: parsed.title || stream.name || "Unknown",
                                url: streamUrl,
                                quality: parsed.resolution,
                                size: parsed.size,
                                addon: addon.name,
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching from addon ${addon.name}:`, error);
                }
            })
        );

        if (allStreams.length === 0) {
            const tvml = generateAlertTemplate(
                "No Sources Found",
                `No streams found for "${movie.title}". Try different addons or check if the movie is available.`
            );
            return new NextResponse(tvml, {
                headers: { "Content-Type": "application/xml" },
            });
        }

        // Sort streams: Usenet/nzbdav first, then by quality
        const sortedStreams = allStreams.sort((a, b) => {
            const aIsUsenet = a.addon.toLowerCase().includes('usenet') || a.addon.toLowerCase().includes('nzb');
            const bIsUsenet = b.addon.toLowerCase().includes('usenet') || b.addon.toLowerCase().includes('nzb');
            if (aIsUsenet && !bIsUsenet) return -1;
            if (!aIsUsenet && bIsUsenet) return 1;
            // Then sort by quality (4K > 1080p > 720p > etc)
            const qualityOrder = ['4k', '2160p', '1080p', '720p', '480p'];
            const aQuality = qualityOrder.findIndex(q => a.quality?.toLowerCase().includes(q));
            const bQuality = qualityOrder.findIndex(q => b.quality?.toLowerCase().includes(q));
            return (aQuality === -1 ? 99 : aQuality) - (bQuality === -1 ? 99 : bQuality);
        });

        // Generate TVML with stream list - simple readable format
        const streamItems = sortedStreams.slice(0, 30).map((stream, index) => {
            const quality = stream.quality || "";
            const size = stream.size || "";
            const subtitle = [quality, size, stream.addon].filter(Boolean).join(" • ");
            // Use proxy URL for better compatibility
            const proxyUrl = `${baseUrl}/api/tvos/proxy?url=${encodeURIComponent(stream.url)}`;

            return `
            <listItemLockup onselect="playWithOptions('${escapeXml(proxyUrl)}', '${escapeXml(movie.title)}', '${escapeXml(stream.name)}')">
                <title>${escapeXml(stream.name)}</title>
                <subtitle>${escapeXml(subtitle)}</subtitle>
            </listItemLockup>`;
        }).join("\n");

        const tvml = wrapDocument(`
    <listTemplate>
        <banner>
            <title>${escapeXml(movie.title)}</title>
            <subtitle>${movie.year || ""} • ${sortedStreams.length} sources available</subtitle>
        </banner>
        <list>
            <header>
                <title>Select Source to Play</title>
            </header>
            <section>
                ${streamItems}
            </section>
        </list>
    </listTemplate>`);

        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
        });
    } catch (error) {
        console.error("Sources error:", error);
        const tvml = generateAlertTemplate(
            "Error",
            "Failed to load sources. Please try again."
        );
        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
            status: 500,
        });
    }
}
