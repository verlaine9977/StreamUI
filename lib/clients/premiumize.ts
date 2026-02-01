import {
    DebridFile,
    DebridFileStatus,
    DebridNode,
    DebridFileNode,
    DebridLinkInfo,
    DebridFileList,
    DebridFileAddStatus,
    AccountType,
    User,
    DebridAuthError,
    DebridError,
    WebDownloadAddResult,
    WebDownloadList,
    WebDownload,
    WebDownloadStatus,
} from "@/lib/types";
import BaseClient from "./base";
import Fuse from "fuse.js";

interface PremiumizeUser {
    customer_id: string;
    premium_until: number;
    limit_used: number;
    space_used: number;
}

interface PremiumizeTransfer {
    id: string;
    name: string;
    message?: string;
    status: string;
    progress: number;
    src?: string;
    folder_id?: string;
    file_id?: string;
}

interface PremiumizeFile {
    id: string;
    name: string;
    type: "file" | "folder";
    size?: number;
    created_at?: number;
    link?: string;
    stream_link?: string;
    transcode_status?: string;
}

interface PremiumizeFolderContent {
    status: string;
    content: PremiumizeFile[];
    name?: string;
    parent_id?: string;
    folder_id?: string;
}

interface PremiumizeDirectDL {
    status: string;
    location: string;
    filename: string;
    filesize: number;
    content?: Array<{
        path: string;
        size: number;
        link: string;
        stream_link?: string;
        transcode_status?: string;
    }>;
}

interface PremiumizeResponse<T = unknown> {
    status: string;
    message?: string;
    error?: string;
    [key: string]: T | string | undefined;
}

export default class PremiumizeClient extends BaseClient {
    private readonly baseUrl = "https://www.premiumize.me/api";
    private transfersCache: PremiumizeTransfer[] = [];

    readonly refreshInterval = 5000;
    readonly supportsEphemeralLinks = false;

    constructor(user: User) {
        super({ user });
    }

    private async makeRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
        await this.rateLimiter.acquire();
        const { apiKey } = this.user;

        const url = new URL(`${this.baseUrl}/${path}`);
        url.searchParams.set("apikey", apiKey);

        const response = await fetch(url.toString(), {
            ...options,
            headers: {
                ...options.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new DebridAuthError("Invalid API key", AccountType.PREMIUMIZE);
            }
            throw new DebridError(`API request failed: ${response.statusText}`, AccountType.PREMIUMIZE);
        }

        const data: PremiumizeResponse<T> = await response.json();
        PremiumizeClient.validateResponse(data);

        return data as unknown as T;
    }

    static async getUser(apiKey: string): Promise<User> {
        const url = new URL("https://www.premiumize.me/api/account/info");
        url.searchParams.set("apikey", apiKey);

        const response = await fetch(url.toString());

        if (!response.ok) {
            if (response.status === 401) {
                throw new DebridAuthError("Invalid API key", AccountType.PREMIUMIZE);
            }
            throw new DebridError(`API request failed: ${response.statusText}`, AccountType.PREMIUMIZE);
        }

        const data = (await response.json()) as PremiumizeResponse<PremiumizeUser> & PremiumizeUser;
        this.validateResponse(data);

        const premiumExpiry = data.premium_until ? new Date(data.premium_until * 1000) : new Date();
        const isPremium = premiumExpiry > new Date();

        return {
            id: `${AccountType.PREMIUMIZE}:${data.customer_id}`,
            apiKey,
            type: AccountType.PREMIUMIZE,
            name: `User ${data.customer_id}`,
            email: "",
            language: "en",
            isPremium,
            premiumExpiresAt: premiumExpiry,
        };
    }

    static async getAuthPin(): Promise<{
        pin: string;
        check: string;
        redirect_url: string;
    }> {
        return {
            pin: "PREMIUMIZE_API_KEY",
            check: "direct_api_key",
            redirect_url: "https://www.premiumize.me/account",
        };
    }

    static async validateAuthPin(pin: string, check: string): Promise<{ success: boolean; apiKey?: string }> {
        if (check === "direct_api_key") {
            try {
                await this.getUser(pin);
                return {
                    success: true,
                    apiKey: pin,
                };
            } catch {
                return { success: false };
            }
        }
        return { success: false };
    }

    async getTorrentList({
        offset = 0,
        limit = 20,
    }: {
        offset?: number;
        limit?: number;
    } = {}): Promise<DebridFileList> {
        await this.syncTransfers();

        const files: DebridFile[] = [];
        const endIndex = Math.min(offset + limit, this.transfersCache.length);

        for (let i = offset; i < endIndex; i++) {
            const transfer = this.transfersCache[i];
            files.push(this.mapToDebridFile(transfer));
        }

        return {
            files,
            offset,
            limit,
            hasMore: endIndex < this.transfersCache.length,
            total: this.transfersCache.length,
        };
    }

    async findTorrents(searchQuery: string): Promise<DebridFile[]> {
        await this.syncTransfers();

        if (!searchQuery.trim()) {
            return this.transfersCache.slice(0, 100).map((t) => this.mapToDebridFile(t));
        }

        const fuse = new Fuse(this.transfersCache, {
            keys: ["name"],
            threshold: 0.3,
            includeScore: true,
            minMatchCharLength: 2,
        });
        const results = fuse.search(searchQuery);

        return results.map((result) => this.mapToDebridFile(result.item));
    }

    async findTorrentById(torrentId: string): Promise<DebridFile | null> {
        await this.syncTransfers();
        const transfer = this.transfersCache.find((t) => t.id === torrentId);
        return transfer ? this.mapToDebridFile(transfer) : null;
    }

    async getDownloadLink({ fileNode }: { fileNode: DebridFileNode; resolve?: boolean }): Promise<DebridLinkInfo> {
        const data = await this.makeRequest<{ location: string; filename: string; filesize: number }>(
            `item/details?id=${fileNode.id}`
        );

        return {
            link: data.location,
            name: data.filename || fileNode.name,
            size: data.filesize || fileNode.size || 0,
        };
    }

    async getTorrentFiles(torrentId: string): Promise<DebridNode[]> {
        const transfer = this.transfersCache.find((t) => t.id === torrentId);

        if (!transfer?.folder_id) {
            if (transfer?.file_id) {
                const fileData = await this.makeRequest<{ id: string; name: string; size: number }>(
                    `item/details?id=${transfer.file_id}`
                );
                return [
                    {
                        id: fileData.id,
                        name: fileData.name,
                        size: fileData.size,
                        type: "file",
                        children: [],
                    },
                ];
            }
            return [];
        }

        return this.getFolderContents(transfer.folder_id);
    }

    private async getFolderContents(folderId: string): Promise<DebridNode[]> {
        const data = await this.makeRequest<PremiumizeFolderContent>(`folder/list?id=${folderId}`);

        if (!data.content) {
            return [];
        }

        const nodes: DebridNode[] = [];

        for (const item of data.content) {
            if (item.type === "folder") {
                const children = await this.getFolderContents(item.id);
                nodes.push({
                    name: item.name,
                    size: undefined,
                    type: "folder",
                    children,
                });
            } else {
                nodes.push({
                    id: item.id,
                    name: item.name,
                    size: item.size,
                    type: "file",
                    children: [],
                });
            }
        }

        return nodes;
    }

    async removeTorrent(torrentId: string): Promise<string> {
        await this.makeRequest(`transfer/delete?id=${torrentId}`, { method: "POST" });

        this.transfersCache = this.transfersCache.filter((t) => t.id !== torrentId);
        return "Transfer removed successfully";
    }

    async restartTorrents(torrentIds: string[]): Promise<Record<string, string>> {
        const results: Record<string, string> = {};

        for (const id of torrentIds) {
            try {
                await this.makeRequest(`transfer/retry?id=${id}`, { method: "POST" });
                results[id] = "Transfer restarted successfully";
            } catch (error) {
                results[id] = error instanceof Error ? error.message : "Failed to restart transfer";
            }
        }

        return results;
    }

    async addMagnetLinks(magnetUris: string[]): Promise<Record<string, DebridFileAddStatus>> {
        const results: Record<string, DebridFileAddStatus> = {};

        for (const magnet of magnetUris) {
            try {
                const formData = new FormData();
                formData.append("src", magnet);

                const data = await this.makeRequest<{ id: string; name?: string }>("transfer/create", {
                    method: "POST",
                    body: formData,
                });

                results[magnet] = {
                    id: data.id,
                    message: `Successfully added: ${data.name || magnet}`,
                    is_cached: false,
                };
            } catch (error) {
                results[magnet] = {
                    message: "Failed to add torrent",
                    error: error instanceof Error ? error.message : "Unknown error",
                    is_cached: false,
                };
            }
        }

        return results;
    }

    async uploadTorrentFiles(files: File[]): Promise<Record<string, DebridFileAddStatus>> {
        const results: Record<string, DebridFileAddStatus> = {};

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append("file", file);

                const data = await this.makeRequest<{ id: string; name?: string }>("transfer/create", {
                    method: "POST",
                    body: formData,
                });

                results[file.name] = {
                    id: data.id,
                    message: `Successfully uploaded: ${data.name || file.name}`,
                    is_cached: false,
                };
            } catch (error) {
                results[file.name] = {
                    message: "Failed to upload torrent file",
                    error: error instanceof Error ? error.message : "Unknown error",
                    is_cached: false,
                };
            }
        }

        return results;
    }

    async addWebDownloads(links: string[]): Promise<WebDownloadAddResult[]> {
        const results: WebDownloadAddResult[] = [];

        for (const link of links) {
            try {
                const data = await this.makeRequest<PremiumizeDirectDL>(`transfer/directdl?src=${encodeURIComponent(link)}`);

                results.push({
                    link,
                    success: true,
                    downloadLink: data.location,
                    name: data.filename,
                    size: data.filesize,
                });
            } catch (error) {
                results.push({
                    link,
                    success: false,
                    error: error instanceof Error ? error.message : "Failed to add link",
                });
            }
        }

        return results;
    }

    async getWebDownloadList({ offset, limit }: { offset: number; limit: number }): Promise<WebDownloadList> {
        await this.syncTransfers();

        const completedTransfers = this.transfersCache.filter((t) => t.status === "finished");
        const paginatedTransfers = completedTransfers.slice(offset, offset + limit);

        const downloads: WebDownload[] = paginatedTransfers.map((t) => ({
            id: t.id,
            name: t.name,
            originalLink: t.src || "",
            status: "completed" as WebDownloadStatus,
            createdAt: new Date(),
        }));

        return {
            downloads,
            offset,
            limit,
            hasMore: offset + limit < completedTransfers.length,
            total: completedTransfers.length,
        };
    }

    async deleteWebDownload(id: string): Promise<void> {
        await this.removeTorrent(id);
    }

    private async syncTransfers(): Promise<void> {
        const data = await this.makeRequest<{ transfers: PremiumizeTransfer[] }>("transfer/list");
        this.transfersCache = data.transfers || [];
    }

    private mapToDebridFile(transfer: PremiumizeTransfer): DebridFile {
        const status = this.mapStatus(transfer.status);

        return {
            id: transfer.id,
            name: transfer.name,
            size: 0,
            status,
            progress: transfer.progress * 100,
            createdAt: new Date(),
            error: transfer.message && status === "failed" ? transfer.message : undefined,
        };
    }

    private mapStatus(status: string): DebridFileStatus {
        const statusLower = status.toLowerCase();

        switch (statusLower) {
            case "finished":
                return "completed";
            case "running":
            case "downloading":
                return "downloading";
            case "seeding":
                return "seeding";
            case "waiting":
            case "queued":
                return "waiting";
            case "error":
            case "timeout":
            case "banned":
                return "failed";
            default:
                return "unknown";
        }
    }

    private static validateResponse(data: PremiumizeResponse): void {
        if (data.status !== "success") {
            const message = data.message || data.error || "API request failed";
            if (message.toLowerCase().includes("auth") || message.toLowerCase().includes("key")) {
                throw new DebridAuthError(message, AccountType.PREMIUMIZE);
            }
            throw new DebridError(message, AccountType.PREMIUMIZE);
        }
    }
}
