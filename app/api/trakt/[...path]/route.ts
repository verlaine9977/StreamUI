import { NextRequest, NextResponse } from "next/server";

const TRAKT_API_BASE = "https://api.trakt.tv";
const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const endpoint = path.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${TRAKT_API_BASE}/${endpoint}${searchParams ? `?${searchParams}` : ""}`;

    if (!TRAKT_CLIENT_ID) {
        return NextResponse.json({ error: "Trakt client ID not configured" }, { status: 500 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                "trakt-api-version": "2",
                "trakt-api-key": TRAKT_CLIENT_ID,
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Trakt API error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Trakt proxy error:", error);
        return NextResponse.json({ error: "Failed to fetch from Trakt" }, { status: 500 });
    }
}
