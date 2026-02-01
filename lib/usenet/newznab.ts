/**
 * Newznab API client for searching NZB indexers
 */

export interface NewznabResult {
    title: string;
    nzbUrl: string;
    size: number;
    grabs: number;
    pubDate: string;
    category: string;
    guid: string;
}

export interface NewznabSearchOptions {
    category?: string; // 2000 = movies, 5000 = TV
    limit?: number;
    imdbId?: string;
    season?: number;
    episode?: number;
}

/**
 * Search a Newznab indexer for NZBs
 */
export async function searchNewznab(
    serverUrl: string,
    apiKey: string,
    query: string,
    options: NewznabSearchOptions = {}
): Promise<NewznabResult[]> {
    const params = new URLSearchParams({
        apikey: apiKey,
        t: "search",
        q: query,
        o: "json",
        limit: String(options.limit || 50),
    });

    if (options.category) {
        params.set("cat", options.category);
    }

    if (options.imdbId) {
        params.set("imdbid", options.imdbId.replace("tt", ""));
    }

    // For TV shows with season/episode
    if (options.season !== undefined) {
        params.set("season", String(options.season));
    }
    if (options.episode !== undefined) {
        params.set("ep", String(options.episode));
    }

    const url = `${serverUrl}/api?${params.toString()}`;

    try {
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Newznab API error: ${response.status}`);
        }

        const data = await response.json();

        // Handle different response formats
        const items = data?.channel?.item || data?.item || [];
        const itemArray = Array.isArray(items) ? items : [items];

        return itemArray
            .filter((item: Record<string, unknown>) => item && item.title)
            .map((item: Record<string, unknown>) => {
                // Handle enclosure which may have @attributes in XML-to-JSON conversion
                const enclosure = item.enclosure as Record<string, unknown> | undefined;
                const enclosureAttrs = enclosure?.["@attributes"] as Record<string, unknown> | undefined;

                return {
                    title: String(item.title || ""),
                    nzbUrl: String(item.link || enclosureAttrs?.url || ""),
                    size: Number(item.size || enclosureAttrs?.length || 0),
                    grabs: Number(item.grabs || 0),
                    pubDate: String(item.pubDate || ""),
                    category: String(item.category || ""),
                    guid: String(item.guid || item.link || ""),
                };
            });
    } catch (error) {
        console.error("Newznab search error:", error);
        return [];
    }
}

/**
 * Get NZB content from URL
 */
export async function getNzbContent(nzbUrl: string, apiKey?: string): Promise<string> {
    const url = apiKey && !nzbUrl.includes("apikey")
        ? `${nzbUrl}${nzbUrl.includes("?") ? "&" : "?"}apikey=${apiKey}`
        : nzbUrl;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch NZB: ${response.status}`);
    }

    return response.text();
}

/**
 * Search for a movie by IMDB ID
 */
export async function searchMovie(
    serverUrl: string,
    apiKey: string,
    title: string,
    imdbId?: string
): Promise<NewznabResult[]> {
    return searchNewznab(serverUrl, apiKey, title, {
        category: "2000", // Movies
        imdbId,
        limit: 25,
    });
}

/**
 * Search for a TV episode
 */
export async function searchTvEpisode(
    serverUrl: string,
    apiKey: string,
    title: string,
    season: number,
    episode: number,
    imdbId?: string
): Promise<NewznabResult[]> {
    // Try with IMDB ID first, then by title
    const query = `${title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;

    return searchNewznab(serverUrl, apiKey, query, {
        category: "5000", // TV
        imdbId,
        season,
        episode,
        limit: 25,
    });
}
