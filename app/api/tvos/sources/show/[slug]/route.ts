import { NextRequest, NextResponse } from "next/server";
import { TraktClient } from "@/lib/trakt";
import { wrapDocument, escapeXml, generateAlertTemplate } from "@/lib/tvos/tvml";

const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

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
        const imdbId = show.ids?.imdb;

        // In a full implementation, this would:
        // 1. Show season/episode picker
        // 2. Fetch sources from configured Stremio addons
        // 3. Check cache status on debrid services
        // 4. Return a list of playable sources

        // For now, show a placeholder with show info
        const tvml = wrapDocument(`
    <alertTemplate>
        <title>${escapeXml(show.title)}</title>
        <description>To play this show, you need to:

1. Set up a debrid account in StreamUI web app
2. Configure Stremio addons for sources
3. Select a season and episode
4. The sources will then appear here

IMDB: ${imdbId || "N/A"}
TMDB: ${show.ids?.tmdb || "N/A"}
Episodes: ${show.aired_episodes || "N/A"}</description>
        <button onselect="dismissModal()">
            <text>OK</text>
        </button>
    </alertTemplate>`);

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
