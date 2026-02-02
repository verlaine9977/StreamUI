import { NextRequest, NextResponse } from "next/server";
import { TraktClient } from "@/lib/trakt";
import {
    generateAlertTemplate,
    wrapDocument,
    escapeXml,
    getPosterUrl,
} from "@/lib/tvos/tvml";

const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

export async function GET(request: NextRequest) {
    // Get the actual public URL from forwarded headers (when behind reverse proxy)
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;
    const query = request.nextUrl.searchParams.get("q");

    // If no query, return the search template
    if (!query) {
        const tvml = wrapDocument(`
    <searchTemplate>
        <searchField id="searchField">Search movies and shows</searchField>
        <collectionList>
            <grid id="search-results">
                <header>
                    <title>Start typing to search</title>
                </header>
                <section>
                </section>
            </grid>
        </collectionList>
    </searchTemplate>`);

        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
        });
    }

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

        const results = await trakt.search(query, ["movie", "show"]);

        // Generate lockups for results
        const lockups = results
            .slice(0, 30) // Limit to 30 results
            .map((result) => {
                const media = result.movie || result.show;
                const type = result.type as "movie" | "show";
                if (!media) return "";

                const poster = getPosterUrl(media);
                const slug = media.ids?.slug || "";

                return `
                <lockup onselect="loadDocument('${baseUrl}/api/tvos/${type}/${slug}')">
                    <img src="${escapeXml(poster)}" width="250" height="375" />
                    <title>${escapeXml(media.title)}</title>
                    <subtitle>${media.year || ""} • ${type === "movie" ? "Movie" : "TV Show"}</subtitle>
                </lockup>`;
            })
            .filter(Boolean)
            .join("\n");

        const tvml = wrapDocument(`
    <stackTemplate>
        <banner>
            <title>Search: ${escapeXml(query)}</title>
            <subtitle>${results.length} results</subtitle>
        </banner>
        <collectionList>
            <grid>
                <header>
                    <title>Results</title>
                </header>
                <section>
                    ${lockups || "<text>No results found</text>"}
                </section>
            </grid>
        </collectionList>
    </stackTemplate>`);

        return new NextResponse(tvml, {
            headers: {
                "Content-Type": "application/xml",
                "Cache-Control": "public, max-age=60", // Cache for 1 minute
            },
        });
    } catch (error) {
        console.error("Search error:", error);
        const tvml = generateAlertTemplate(
            "Error",
            "Search failed. Please try again."
        );
        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
            status: 500,
        });
    }
}
