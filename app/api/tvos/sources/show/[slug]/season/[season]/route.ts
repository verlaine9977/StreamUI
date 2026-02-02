import { NextRequest, NextResponse } from "next/server";
import { TraktClient } from "@/lib/trakt";
import { wrapDocument, escapeXml, generateAlertTemplate } from "@/lib/tvos/tvml";

const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; season: string }> }
) {
    const { slug, season } = await params;
    const seasonNum = parseInt(season);

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
        const trakt = new TraktClient({
            clientId: TRAKT_CLIENT_ID,
            baseUrl: "https://api.trakt.tv",
        });

        const show = await trakt.getShow(slug);
        const episodes = await trakt.getShowEpisodes(slug, seasonNum);

        const episodeItems = episodes.map(ep => `
            <listItemLockup onselect="loadDocument('${baseUrl}/api/tvos/sources/show/${slug}?season=${seasonNum}&episode=${ep.number}')">
                <title>${ep.number}. ${escapeXml(ep.title || `Episode ${ep.number}`)}</title>
                <subtitle>${ep.runtime ? `${ep.runtime} min` : ""}${ep.first_aired ? ` • ${new Date(ep.first_aired).toLocaleDateString()}` : ""}</subtitle>
            </listItemLockup>`).join("\n");

        const tvml = wrapDocument(`
    <listTemplate>
        <banner>
            <title>${escapeXml(show.title)}</title>
            <subtitle>Season ${seasonNum} • ${episodes.length} episodes</subtitle>
        </banner>
        <list>
            <section>
                ${episodeItems}
            </section>
        </list>
    </listTemplate>`);

        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
        });
    } catch (error) {
        console.error("Season error:", error);
        const tvml = generateAlertTemplate(
            "Error",
            "Failed to load episodes. Please try again."
        );
        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
            status: 500,
        });
    }
}
