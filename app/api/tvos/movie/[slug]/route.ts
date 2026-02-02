import { NextRequest, NextResponse } from "next/server";
import { TraktClient } from "@/lib/trakt";
import {
    generateProductTemplate,
    generateAlertTemplate,
} from "@/lib/tvos/tvml";

const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const baseUrl = request.nextUrl.origin;

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

        const movie = await trakt.getMovie(slug);

        const tvml = generateProductTemplate(movie, "movie", baseUrl);

        return new NextResponse(tvml, {
            headers: {
                "Content-Type": "application/xml",
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
            },
        });
    } catch (error) {
        console.error("Movie detail error:", error);
        const tvml = generateAlertTemplate(
            "Error",
            "Failed to load movie details. Please try again."
        );
        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
            status: 500,
        });
    }
}
