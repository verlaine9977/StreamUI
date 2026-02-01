import { z } from "zod";

export enum AccountType {
    REALDEBRID = "real-debrid",
    TORBOX = "torbox",
    ALLDEBRID = "alldebrid",
    PREMIUMIZE = "premiumize",
    NZBDAV = "nzbdav",
}

export const userSchema = z.object({
    id: z.string().trim().min(1).default(crypto.randomUUID()),
    name: z.string().trim().min(1),
    email: z.string().trim().min(1),
    language: z.string().trim().min(1),
    isPremium: z.boolean(),
    premiumExpiresAt: z.date(),
    apiKey: z.string().trim().min(1),
    apiUrl: z.string().url().optional(), // Required for nzbdav
    type: z.enum(Object.values(AccountType)),
});

export const addUserSchema = z.object({
    type: z.enum(Object.values(AccountType)),
    apiKey: z.string().trim().min(1),
    apiUrl: z.string().trim().optional(),
}).refine(
    (data) => {
        // apiUrl is required for nzbdav
        if (data.type === AccountType.NZBDAV) {
            return !!data.apiUrl && data.apiUrl.length > 0;
        }
        return true;
    },
    {
        message: "API URL is required for nzbdav",
        path: ["apiUrl"],
    }
).refine(
    (data) => {
        // apiUrl must be a valid URL if provided
        if (data.apiUrl && data.apiUrl.length > 0) {
            try {
                new URL(data.apiUrl);
                return true;
            } catch {
                return false;
            }
        }
        return true;
    },
    {
        message: "Invalid URL format",
        path: ["apiUrl"],
    }
);
