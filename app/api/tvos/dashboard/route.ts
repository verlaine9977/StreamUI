import { NextRequest, NextResponse } from "next/server";
import { TraktClient } from "@/lib/trakt";
import {
    generateDashboardTemplate,
    generateAlertTemplate,
} from "@/lib/tvos/tvml";

const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

export async function GET(request: NextRequest) {
    const baseUrl = request.nextUrl.origin;

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
        const tvml = generateAlertTemplate(
            "Error",
            "Failed to load content. Please try again later."
        );
        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
            status: 500,
        });
    }
}
