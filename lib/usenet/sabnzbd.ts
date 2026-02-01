/**
 * SABnzbd API client for NZB download management
 */

export interface SabnzbdAddResult {
    status: boolean;
    nzoId?: string;
    error?: string;
}

export interface SabnzbdQueueItem {
    nzoId: string;
    filename: string;
    status: string;
    percentage: number;
    mb: number;
    mbleft: number;
    eta: string;
}

export interface SabnzbdHistoryItem {
    nzoId: string;
    name: string;
    status: string;
    storage: string;
    completed: number;
    downloadTime: number;
    bytes: number;
}

/**
 * Add NZB to SABnzbd by URL
 */
export async function addNzbByUrl(
    serverUrl: string,
    apiKey: string,
    nzbUrl: string,
    name: string
): Promise<SabnzbdAddResult> {
    const params = new URLSearchParams({
        mode: "addurl",
        apikey: apiKey,
        output: "json",
        name: nzbUrl,
        nzbname: name,
    });

    try {
        const response = await fetch(`${serverUrl}/api?${params.toString()}`);
        const data = await response.json();

        if (data.status === true || data.nzo_ids?.length > 0) {
            return {
                status: true,
                nzoId: data.nzo_ids?.[0],
            };
        }

        return {
            status: false,
            error: data.error || "Failed to add NZB",
        };
    } catch (error) {
        return {
            status: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Add NZB content directly to SABnzbd
 */
export async function addNzbContent(
    serverUrl: string,
    apiKey: string,
    nzbContent: string,
    name: string
): Promise<SabnzbdAddResult> {
    const formData = new FormData();
    const blob = new Blob([nzbContent], { type: "application/x-nzb" });
    formData.append("name", blob, `${name}.nzb`);
    formData.append("mode", "addfile");
    formData.append("apikey", apiKey);
    formData.append("output", "json");
    formData.append("nzbname", name);

    try {
        const response = await fetch(`${serverUrl}/api`, {
            method: "POST",
            body: formData,
        });
        const data = await response.json();

        if (data.status === true || data.nzo_ids?.length > 0) {
            return {
                status: true,
                nzoId: data.nzo_ids?.[0],
            };
        }

        return {
            status: false,
            error: data.error || "Failed to add NZB",
        };
    } catch (error) {
        return {
            status: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Get SABnzbd queue
 */
export async function getQueue(
    serverUrl: string,
    apiKey: string
): Promise<SabnzbdQueueItem[]> {
    const params = new URLSearchParams({
        mode: "queue",
        apikey: apiKey,
        output: "json",
    });

    try {
        const response = await fetch(`${serverUrl}/api?${params.toString()}`);
        const data = await response.json();

        const slots = data.queue?.slots || [];
        return slots.map((slot: Record<string, unknown>) => ({
            nzoId: String(slot.nzo_id || ""),
            filename: String(slot.filename || ""),
            status: String(slot.status || ""),
            percentage: Number(slot.percentage || 0),
            mb: Number(slot.mb || 0),
            mbleft: Number(slot.mbleft || 0),
            eta: String(slot.eta || ""),
        }));
    } catch {
        return [];
    }
}

/**
 * Get download status by nzoId
 */
export async function getDownloadStatus(
    serverUrl: string,
    apiKey: string,
    nzoId: string
): Promise<{ found: boolean; percentage: number; status: string; eta: string }> {
    const queue = await getQueue(serverUrl, apiKey);
    const item = queue.find((q) => q.nzoId === nzoId);

    if (item) {
        return {
            found: true,
            percentage: item.percentage,
            status: item.status,
            eta: item.eta,
        };
    }

    // Check history if not in queue
    const params = new URLSearchParams({
        mode: "history",
        apikey: apiKey,
        output: "json",
    });

    try {
        const response = await fetch(`${serverUrl}/api?${params.toString()}`);
        const data = await response.json();
        const slots = data.history?.slots || [];
        const historyItem = slots.find((s: Record<string, unknown>) => s.nzo_id === nzoId);

        if (historyItem) {
            return {
                found: true,
                percentage: 100,
                status: String(historyItem.status || "Completed"),
                eta: "",
            };
        }
    } catch {
        // Ignore
    }

    return {
        found: false,
        percentage: 0,
        status: "Unknown",
        eta: "",
    };
}

/**
 * Check disk space
 */
export async function getDiskSpace(
    serverUrl: string,
    apiKey: string
): Promise<{ freeGb: number; totalGb: number }> {
    const params = new URLSearchParams({
        mode: "queue",
        apikey: apiKey,
        output: "json",
    });

    try {
        const response = await fetch(`${serverUrl}/api?${params.toString()}`);
        const data = await response.json();

        return {
            freeGb: Number(data.queue?.diskspace1 || 0),
            totalGb: Number(data.queue?.diskspacetotal1 || 0),
        };
    } catch {
        return { freeGb: 0, totalGb: 0 };
    }
}
