import { NextRequest, NextResponse } from "next/server";
import { TraktClient } from "@/lib/trakt";
import { wrapDocument, escapeXml, generateAlertTemplate, getPosterUrl, getFanartUrl } from "@/lib/tvos/tvml";

const TRAKT_CLIENT_ID = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; season: string }> }
) {
    const { slug, season } = await params;
    const seasonNum = parseInt(season);

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

        if (!episodes || episodes.length === 0) {
            const tvml = generateAlertTemplate(
                "No Episodes",
                `No episodes found for Season ${seasonNum}.`
            );
            return new NextResponse(tvml, {
                headers: { "Content-Type": "application/xml" },
            });
        }

        const episodeItems = episodes.map(ep => `
            <listItemLockup onselect="loadDocument('${baseUrl}/api/tvos/sources/show/${slug}?season=${seasonNum}&episode=${ep.number}')">
                <ordinal minLength="2">${ep.number}</ordinal>
                <title>${escapeXml(ep.title)}</title>
                <relatedContent>
                    <lockup>
                        <subtitle>${ep.runtime ? `${ep.runtime}m` : ""}</subtitle>
                    </lockup>
                </relatedContent>
            </listItemLockup>`).join("\n");

        const tvml = wrapDocument(`
    <compilationTemplate>
        <background>
            <img src="${escapeXml(getFanartUrl(show))}" />
        </background>
        <list>
            <relatedContent>
                <lockup>
                    <img src="${escapeXml(getPosterUrl(show))}" width="300" height="450" />
                    <title>${escapeXml(show.title)}</title>
                    <subtitle>Season ${seasonNum} - ${episodes.length} episodes</subtitle>
                </lockup>
            </relatedContent>
            <header>
                <title>Episodes</title>
            </header>
            <section>
                ${episodeItems}
            </section>
        </list>
    </compilationTemplate>`);

        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
        });
    } catch (error) {
        console.error("Season episodes error:", error);
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
