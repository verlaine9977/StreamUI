import { NextRequest, NextResponse } from "next/server";
import { TraktClient } from "@/lib/trakt";
import {
    generateDashboardTemplate,
    generateAlertTemplate,
} from "@/lib/tvos/tvml";

const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

export async function GET(request: NextRequest) {
    // Get the actual public URL from forwarded headers (when behind reverse proxy)
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;

    if (!TRAKT_CLIENT_ID) {
        const tvml = generateAlertTemplate(
            "Configuration Error",
            "Trakt client ID not configured. Please check server settings."
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

        // Fetch data in parallel
        const [
            trendingMovies,
            trendingShows,
            popularMovies,
            popularShows,
            boxOffice,
            anticipatedMovies,
        ] = await Promise.all([
            trakt.getTrendingMovies(15),
            trakt.getTrendingShows(15),
            trakt.getPopularMovies(15),
            trakt.getPopularShows(15),
            trakt.getBoxOfficeMovies(),
            trakt.getAnticipatedMovies(15),
        ]);

        // Combine trending movies and shows
        const trendingMixed = [];
        const maxLen = Math.max(trendingMovies.length, trendingShows.length);
        for (let i = 0; i < maxLen && trendingMixed.length < 20; i++) {
            if (i < trendingMovies.length) trendingMixed.push(trendingMovies[i]);
            if (i < trendingShows.length && trendingMixed.length < 20) {
                trendingMixed.push(trendingShows[i]);
            }
        }

        const shelves = [
            { title: "Trending", items: trendingMixed },
            { title: "Popular Movies", items: popularMovies },
            { title: "Popular Shows", items: popularShows },
            { title: "Box Office", items: boxOffice },
            { title: "Coming Soon", items: anticipatedMovies },
        ];

        const tvml = generateDashboardTemplate(shelves, baseUrl);

        return new NextResponse(tvml, {
            headers: {
                "Content-Type": "application/xml",
                "Cache-Control": "public, max-age=300", // Cache for 5 minutes
            },
        });
    } catch (error) {
        console.error("Dashboard error:", error);

        // Return a fallback dashboard with placeholder message
        const fallbackTvml = `<?xml version="1.0" encoding="UTF-8" ?>
<document>
    <stackTemplate>
        <banner>
            <title>StreamUI</title>
            <description>Welcome to StreamUI for Apple TV</description>
        </banner>
        <collectionList>
            <grid>
                <section>
                    <header>
                        <title>Getting Started</title>
                    </header>
                    <lockup>
                        <img src="https://via.placeholder.com/400x225/1a1a2e/ffffff?text=Search" width="400" height="225" />
                        <title>Search</title>
                        <description>Use the Search tab to find movies and shows</description>
                    </lockup>
                    <lockup>
                        <img src="https://via.placeholder.com/400x225/16213e/ffffff?text=Files" width="400" height="225" />
                        <title>Files</title>
                        <description>Browse your debrid files</description>
                    </lockup>
                    <lockup>
                        <img src="https://via.placeholder.com/400x225/0f3460/ffffff?text=Settings" width="400" height="225" />
                        <title>Settings</title>
                        <description>Configure your accounts</description>
                    </lockup>
                </section>
            </grid>
        </collectionList>
    </stackTemplate>
</document>`;

        return new NextResponse(fallbackTvml, {
            headers: { "Content-Type": "application/xml" },
        });
    }
}
