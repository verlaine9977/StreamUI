// TVML Template Utilities for tvOS API

import { TraktMedia, TraktMediaItem, TraktSearchResult } from "../trakt";

// Helper to escape XML special characters
export function escapeXml(text: string | undefined | null): string {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// Get poster image URL from Trakt media
export function getPosterUrl(media: TraktMedia | undefined, size: "w300" | "w500" | "original" = "w500"): string {
    if (!media?.images?.poster?.[0]) {
        return ""; // Fallback handled by tvOS
    }
    const posterPath = media.images.poster[0];
    // If it's already a full URL, return as is
    if (posterPath.startsWith("http")) {
        return posterPath;
    }
    // Trakt now returns media.trakt.tv paths
    if (posterPath.includes("media.trakt.tv")) {
        return `https://${posterPath}`;
    }
    // Legacy TMDB paths
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

// Get fanart/backdrop image URL
export function getFanartUrl(media: TraktMedia | undefined, size: "w780" | "w1280" | "original" = "w1280"): string {
    if (!media?.images?.fanart?.[0]) {
        return "";
    }
    const fanartPath = media.images.fanart[0];
    // If it's already a full URL, return as is
    if (fanartPath.startsWith("http")) {
        return fanartPath;
    }
    // Trakt now returns media.trakt.tv paths
    if (fanartPath.includes("media.trakt.tv")) {
        return `https://${fanartPath}`;
    }
    // Legacy TMDB paths
    return `https://image.tmdb.org/t/p/${size}${fanartPath}`;
}

// Format runtime to human readable
export function formatRuntime(minutes: number | undefined): string {
    if (!minutes) return "";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

// Format genres array
export function formatGenres(genres: string[] | undefined): string {
    if (!genres || genres.length === 0) return "";
    return genres
        .slice(0, 3)
        .map((g) => g.charAt(0).toUpperCase() + g.slice(1))
        .join(", ");
}

// Generate a lockup element for a media item
export function generateLockup(
    media: TraktMedia,
    type: "movie" | "show",
    baseUrl: string
): string {
    const poster = getPosterUrl(media);
    const slug = media.ids?.slug || "";

    return `
        <lockup onselect="loadDocument('${baseUrl}/api/tvos/${type}/${slug}')">
            <img src="${escapeXml(poster)}" width="250" height="375" />
            <title>${escapeXml(media.title)}</title>
            <subtitle>${media.year || ""}</subtitle>
        </lockup>`;
}

// Generate a shelf with media items
export function generateShelf(
    title: string,
    items: TraktMediaItem[],
    baseUrl: string
): string {
    const lockups = items
        .map((item) => {
            const media = item.movie || item.show;
            const type = item.movie ? "movie" : "show";
            if (!media) return "";
            return generateLockup(media, type, baseUrl);
        })
        .filter(Boolean)
        .join("\n");

    return `
        <shelf>
            <header>
                <title>${escapeXml(title)}</title>
            </header>
            <section>
                ${lockups}
            </section>
        </shelf>`;
}

// Generate the XML document wrapper
export function wrapDocument(content: string): string {
    return `<?xml version="1.0" encoding="UTF-8" ?>
<document>
${content}
</document>`;
}

// Generate dashboard template
export function generateDashboardTemplate(
    shelves: { title: string; items: TraktMediaItem[] }[],
    baseUrl: string
): string {
    const shelfContent = shelves
        .filter((shelf) => shelf.items.length > 0)
        .map((shelf) => generateShelf(shelf.title, shelf.items, baseUrl))
        .join("\n");

    return wrapDocument(`
    <stackTemplate>
        <banner>
            <title>StreamUI</title>
        </banner>
        <collectionList>
            ${shelfContent}
        </collectionList>
    </stackTemplate>`);
}

// Generate product template for movie/show details
export function generateProductTemplate(
    media: TraktMedia,
    type: "movie" | "show",
    _baseUrl: string
): string {
    const fanart = getFanartUrl(media);
    const poster = getPosterUrl(media);
    const runtime = formatRuntime(media.runtime);
    const genres = formatGenres(media.genres);
    const slug = media.ids?.slug || "";

    const subtitle = [media.year, runtime, genres].filter(Boolean).join(" • ");

    return wrapDocument(`
    <productTemplate>
        <banner>
            ${fanart ? `<heroImg src="${escapeXml(fanart)}" width="1920" height="1080" />` : ""}
            <infoList>
                ${media.certification ? `
                <info>
                    <header><title>Rated</title></header>
                    <text>${escapeXml(media.certification)}</text>
                </info>` : ""}
                ${media.rating ? `
                <info>
                    <header><title>Rating</title></header>
                    <text>${media.rating.toFixed(1)}/10</text>
                </info>` : ""}
                ${media.status ? `
                <info>
                    <header><title>Status</title></header>
                    <text>${escapeXml(media.status)}</text>
                </info>` : ""}
            </infoList>
            <stack>
                ${poster ? `<img src="${escapeXml(poster)}" width="250" height="375" />` : ""}
                <title>${escapeXml(media.title)}</title>
                <subtitle>${escapeXml(subtitle)}</subtitle>
                <description allowsZooming="true">${escapeXml(media.overview)}</description>
                <row>
                    <buttonLockup onselect="playMedia('${type}', '${escapeXml(slug)}')">
                        <badge src="resource://button-play" />
                        <title>Play</title>
                    </buttonLockup>
                    ${media.trailer ? `
                    <buttonLockup onselect="playTrailer('${escapeXml(media.trailer)}')">
                        <badge src="resource://button-preview" />
                        <title>Trailer</title>
                    </buttonLockup>` : ""}
                </row>
            </stack>
        </banner>
        ${type === "show" ? `
        <shelf>
            <header>
                <title>Seasons</title>
            </header>
            <section id="seasons-section">
                <!-- Seasons loaded dynamically -->
            </section>
        </shelf>` : ""}
    </productTemplate>`);
}

// Generate search template
export function generateSearchTemplate(_baseUrl: string): string {
    return wrapDocument(`
    <searchTemplate>
        <searchField>Search movies and shows</searchField>
        <collectionList>
            <shelf id="search-results">
                <header>
                    <title>Results</title>
                </header>
                <section>
                </section>
            </shelf>
        </collectionList>
    </searchTemplate>`);
}

// Generate search results
export function generateSearchResults(
    results: TraktSearchResult[],
    baseUrl: string
): string {
    const lockups = results
        .map((result) => {
            const media = result.movie || result.show;
            const type = result.type as "movie" | "show";
            if (!media) return "";
            return generateLockup(media, type, baseUrl);
        })
        .filter(Boolean)
        .join("\n");

    return wrapDocument(`
    <shelf>
        <header>
            <title>Search Results</title>
        </header>
        <section>
            ${lockups || "<text>No results found</text>"}
        </section>
    </shelf>`);
}

// Generate alert template (for errors, confirmations, etc.)
export function generateAlertTemplate(
    title: string,
    description: string,
    buttons: { title: string; onselect?: string }[] = [{ title: "OK" }]
): string {
    const buttonElements = buttons
        .map(
            (btn) =>
                `<button ${btn.onselect ? `onselect="${escapeXml(btn.onselect)}"` : ""}>
                    <text>${escapeXml(btn.title)}</text>
                </button>`
        )
        .join("\n");

    return wrapDocument(`
    <alertTemplate>
        <title>${escapeXml(title)}</title>
        <description>${escapeXml(description)}</description>
        ${buttonElements}
    </alertTemplate>`);
}

// Generate loading template
export function generateLoadingTemplate(title = "Loading..."): string {
    return wrapDocument(`
    <loadingTemplate>
        <activityIndicator>
            <title>${escapeXml(title)}</title>
        </activityIndicator>
    </loadingTemplate>`);
}

// Generate menu bar template for main navigation
export function generateMenuBarTemplate(_baseUrl: string): string {
    return wrapDocument(`
    <menuBarTemplate>
        <menuBar>
            <menuItem id="dashboard" autoHighlight="true">
                <title>Home</title>
            </menuItem>
            <menuItem id="search">
                <title>Search</title>
            </menuItem>
            <menuItem id="files">
                <title>Files</title>
            </menuItem>
            <menuItem id="settings">
                <title>Settings</title>
            </menuItem>
        </menuBar>
    </menuBarTemplate>`);
}

// Generate list template for file browser
export function generateListTemplate(
    title: string,
    items: { id: string; name: string; subtitle?: string; onselect?: string }[]
): string {
    const listItems = items
        .map(
            (item) => `
            <listItemLockup ${item.onselect ? `onselect="${escapeXml(item.onselect)}"` : ""}>
                <title>${escapeXml(item.name)}</title>
                ${item.subtitle ? `<subtitle>${escapeXml(item.subtitle)}</subtitle>` : ""}
            </listItemLockup>`
        )
        .join("\n");

    return wrapDocument(`
    <listTemplate>
        <banner>
            <title>${escapeXml(title)}</title>
        </banner>
        <list>
            <section>
                ${listItems}
            </section>
        </list>
    </listTemplate>`);
}
