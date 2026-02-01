import BaseClient from "./base";
import {
    User,
    DebridFileAddStatus,
    DebridFile,
    DebridFileNode,
    DebridLinkInfo,
    WebDownloadAddResult,
    WebDownloadList,
    DebridFileStatus,
} from "@/lib/types";
import { AccountType } from "@/lib/schemas";

interface NzbdavQueueSlot {
    nzo_id: string;
    nzb_name: string;
    name: string;
    category: string;
    status: string;
    percentage: number;
    mb: number;
    mbleft: number;
    eta: string;
    timeleft: string;
}

interface NzbdavHistorySlot {
    nzo_id: string;
    nzb_name: string;
    name: string;
    category: string;
    status: string;
    bytes: number;
    storage: string;
    download_time: number;
    fail_message: string;
}

interface NzbdavQueueResponse {
    queue: {
        paused: boolean;
        slots: NzbdavQueueSlot[];
        noofslots: number;
    };
    status: boolean;
    error: string | null;
}

interface NzbdavHistoryResponse {
    history: {
        slots: NzbdavHistorySlot[];
        noofslots: number;
    };
    status: boolean;
    error: string | null;
}

/**
 * nzbdav client - Usenet streaming via SABnzbd-compatible API
 */
export default class NzbdavClient extends BaseClient {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    readonly refreshInterval = 10000;
    readonly supportsEphemeralLinks = false;

    constructor(user: User) {
        super({ user, rateLimiter: { maxRequests: 60, intervalMs: 60000 } });
        this.baseUrl = user.apiUrl?.replace(/\/$/, "") || "";
        this.apiKey = user.apiKey;
    }

    static async getUser(apiKey: string, apiUrl?: string): Promise<User> {
        if (!apiUrl) {
            throw new Error("nzbdav requires API URL");
        }

        const url = `${apiUrl.replace(/\/$/, "")}/api?mode=queue&output=json&apikey=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json() as NzbdavQueueResponse;

        if (!data.status) {
            throw new Error(data.error || "Failed to connect to nzbdav");
        }

        return {
            id: `nzbdav-${apiKey.substring(0, 8)}`,
            type: AccountType.NZBDAV,
            apiKey,
            apiUrl,
            name: "Usenet (nzbdav)",
            email: "nzbdav@local",
            language: "en",
            isPremium: true,
            premiumExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        };
    }

    private async request<T>(mode: string, params: Record<string, string> = {}): Promise<T> {
        await this.rateLimiter.acquire();

        const searchParams = new URLSearchParams({
            mode,
            output: "json",
            apikey: this.apiKey,
            ...params,
        });

        const response = await fetch(`${this.baseUrl}/api?${searchParams.toString()}`);
        if (!response.ok) {
            throw new Error(`nzbdav API error: ${response.status}`);
        }

        return response.json() as Promise<T>;
    }

    async getQueue(): Promise<NzbdavQueueSlot[]> {
        const data = await this.request<NzbdavQueueResponse>("queue");
        return data.queue?.slots || [];
    }

    async getHistory(limit = 100): Promise<NzbdavHistorySlot[]> {
        const data = await this.request<NzbdavHistoryResponse>("history", { limit: String(limit) });
        return data.history?.slots || [];
    }

    // BaseClient abstract method implementations

    async addMagnetLinks(magnetUris: string[]): Promise<Record<string, DebridFileAddStatus>> {
        const results: Record<string, DebridFileAddStatus> = {};
        for (const uri of magnetUris) {
            results[uri] = {
                message: "nzbdav does not support magnet links",
                error: "nzbdav does not support magnet links. Use a debrid service for torrents.",
                is_cached: false,
            };
        }
        return results;
    }

    async uploadTorrentFiles(files: File[]): Promise<Record<string, DebridFileAddStatus>> {
        const results: Record<string, DebridFileAddStatus> = {};
        for (const file of files) {
            results[file.name] = {
                message: "nzbdav does not support torrent files",
                error: "nzbdav does not support torrent files. Use a debrid service for torrents.",
                is_cached: false,
            };
        }
        return results;
    }

    private mapStatus(status: string): DebridFileStatus {
        const statusLower = status.toLowerCase();
        if (statusLower === "completed") return "completed";
        if (statusLower === "downloading") return "downloading";
        if (statusLower === "paused") return "paused";
        if (statusLower === "failed") return "failed";
        return "unknown";
    }

    async findTorrents(searchQuery: string): Promise<DebridFile[]> {
        const history = await this.getHistory(500);
        const queue = await this.getQueue();

        const results: DebridFile[] = [];
        const query = searchQuery.toLowerCase();

        for (const item of history) {
            if (item.name.toLowerCase().includes(query) || item.nzb_name.toLowerCase().includes(query)) {
                const fileNode: DebridFileNode = {
                    id: item.nzo_id,
                    name: item.name,
                    size: item.bytes,
                    type: "file",
                    children: [],
                };
                results.push({
                    id: item.nzo_id,
                    name: item.name,
                    size: item.bytes,
                    createdAt: new Date(),
                    status: this.mapStatus(item.status),
                    progress: item.status === "Completed" ? 100 : 0,
                    files: [fileNode],
                });
            }
        }

        for (const item of queue) {
            if (item.name.toLowerCase().includes(query) || item.nzb_name.toLowerCase().includes(query)) {
                results.push({
                    id: item.nzo_id,
                    name: item.name,
                    size: item.mb * 1024 * 1024,
                    createdAt: new Date(),
                    status: "downloading",
                    progress: item.percentage,
                    files: [],
                });
            }
        }

        return results;
    }

    async findTorrentById(torrentId: string): Promise<DebridFile | null> {
        const history = await this.getHistory(500);
        const item = history.find(h => h.nzo_id === torrentId);

        if (item) {
            const fileNode: DebridFileNode = {
                id: item.nzo_id,
                name: item.name,
                size: item.bytes,
                type: "file",
                children: [],
            };
            return {
                id: item.nzo_id,
                name: item.name,
                size: item.bytes,
                createdAt: new Date(),
                status: this.mapStatus(item.status),
                progress: item.status === "Completed" ? 100 : 0,
                files: [fileNode],
            };
        }

        const queue = await this.getQueue();
        const queueItem = queue.find(q => q.nzo_id === torrentId);

        if (queueItem) {
            return {
                id: queueItem.nzo_id,
                name: queueItem.name,
                size: queueItem.mb * 1024 * 1024,
                createdAt: new Date(),
                status: "downloading",
                progress: queueItem.percentage,
                files: [],
            };
        }

        return null;
    }

    async getDownloadLink({ fileNode }: { fileNode: DebridFileNode }): Promise<DebridLinkInfo> {
        return {
            link: `${this.baseUrl}/webdav/${fileNode.name}`,
            name: fileNode.name,
            size: fileNode.size || 0,
        };
    }

    async addWebDownloads(links: string[]): Promise<WebDownloadAddResult[]> {
        const results: WebDownloadAddResult[] = [];

        for (const link of links) {
            if (link.includes(".nzb") || link.includes("nzbgeek") || link.includes("nzbplanet")) {
                const params: Record<string, string> = { name: link };
                const data = await this.request<{ status: boolean; nzo_ids?: string[]; error?: string }>("addurl", params);

                results.push({
                    id: data.nzo_ids?.[0] || "",
                    link,
                    success: data.status && !!data.nzo_ids?.length,
                    error: data.error,
                });
            } else {
                results.push({
                    id: "",
                    link,
                    success: false,
                    error: "nzbdav only accepts NZB URLs",
                });
            }
        }

        return results;
    }

    async getWebDownloadList({ offset, limit }: { offset: number; limit: number }): Promise<WebDownloadList> {
        const [queue, history] = await Promise.all([
            this.getQueue(),
            this.getHistory(limit + offset),
        ]);

        const downloads = [
            ...queue.map(item => ({
                id: item.nzo_id,
                name: item.name,
                originalLink: "",
                size: item.mb * 1024 * 1024,
                status: "processing" as const,
                progress: item.percentage,
                createdAt: new Date(),
            })),
            ...history.map(item => ({
                id: item.nzo_id,
                name: item.name,
                originalLink: item.storage,
                downloadLink: item.storage,
                size: item.bytes,
                status: item.status === "Completed" ? "completed" as const : "failed" as const,
                progress: item.status === "Completed" ? 100 : 0,
                createdAt: new Date(),
                error: item.fail_message || undefined,
            })),
        ];

        const slicedDownloads = downloads.slice(offset, offset + limit);
        return {
            downloads: slicedDownloads,
            total: downloads.length,
            offset,
            limit,
            hasMore: offset + limit < downloads.length,
        };
    }

    async deleteWebDownload(id: string): Promise<void> {
        await this.request("queue", {
            name: "delete",
            value: id,
            del_files: "1",
        });
    }

    async removeTorrent(id: string): Promise<string> {
        await this.deleteWebDownload(id);
        return `Removed ${id}`;
    }

    // Methods required by other parts of the codebase
    async getTorrentList({ offset = 0, limit = 50 }: { offset?: number; limit?: number } = {}): Promise<{ files: DebridFile[]; total: number; hasMore: boolean; offset: number; limit: number }> {
        const allFiles = await this.findTorrents("");
        const slicedFiles = allFiles.slice(offset, offset + limit);
        return {
            files: slicedFiles,
            total: allFiles.length,
            hasMore: offset + limit < allFiles.length,
            offset,
            limit,
        };
    }

    async getTorrentFiles(torrentId: string): Promise<DebridFileNode[]> {
        const torrent = await this.findTorrentById(torrentId);
        return (torrent?.files as DebridFileNode[]) || [];
    }

    async restartTorrents(ids: string[]): Promise<Record<string, string>> {
        // nzbdav doesn't support restarting - return empty results
        const results: Record<string, string> = {};
        for (const id of ids) {
            results[id] = "Restart not supported for nzbdav";
        }
        return results;
    }
}
