import { relations } from "drizzle-orm";
import { pgTable, text, boolean, integer, timestamp, jsonb, uniqueIndex, index, uuid, real } from "drizzle-orm/pg-core";
import { AccountType } from "../schemas";
export * from "./auth-schema";
import { user } from "./auth-schema";

// Profiles table - up to 4 profiles per user (like Netflix)
export const profiles = pgTable(
    "profiles",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        avatar: text("avatar"), // URL or emoji
        color: text("color").default("#6366f1"), // Profile accent color
        isDefault: boolean("is_default").default(false),
        // Age restriction (null = no restriction, 7, 12, 15, 18)
        maxAgeRating: integer("max_age_rating"),
        // Trakt integration
        traktAccessToken: text("trakt_access_token"),
        traktRefreshToken: text("trakt_refresh_token"),
        traktExpiresAt: timestamp("trakt_expires_at"),
        traktUsername: text("trakt_username"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
    },
    (table) => [
        index("profiles_userId_idx").on(table.userId),
    ]
);

// Favorites table - tracks user favorites per profile
export const favorites = pgTable(
    "favorites",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        profileId: uuid("profile_id")
            .notNull()
            .references(() => profiles.id, { onDelete: "cascade" }),
        mediaType: text("media_type", { enum: ["movie", "show"] }).notNull(),
        imdbId: text("imdb_id").notNull(),
        tmdbId: integer("tmdb_id"),
        traktId: integer("trakt_id"),
        title: text("title").notNull(),
        year: integer("year"),
        posterUrl: text("poster_url"),
        slug: text("slug"),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        index("favorites_profileId_idx").on(table.profileId),
        uniqueIndex("unique_favorite").on(table.profileId, table.imdbId),
    ]
);

// Watch progress table - tracks continue watching
export const watchProgress = pgTable(
    "watch_progress",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        profileId: uuid("profile_id")
            .notNull()
            .references(() => profiles.id, { onDelete: "cascade" }),
        mediaType: text("media_type", { enum: ["movie", "show"] }).notNull(),
        imdbId: text("imdb_id").notNull(),
        tmdbId: integer("tmdb_id"),
        title: text("title").notNull(),
        posterUrl: text("poster_url"),
        // For TV shows
        season: integer("season"),
        episode: integer("episode"),
        episodeTitle: text("episode_title"),
        // Progress tracking
        progress: real("progress").default(0), // 0-100 percentage
        duration: integer("duration"), // in seconds
        watchedAt: timestamp("watched_at").notNull().defaultNow(),
        completed: boolean("completed").default(false),
    },
    (table) => [
        index("watch_progress_profileId_idx").on(table.profileId),
        uniqueIndex("unique_watch_progress").on(table.profileId, table.imdbId, table.season, table.episode),
    ]
);

// User accounts table - stores debrid service accounts
export const userAccounts = pgTable(
    "user_accounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        apiKey: text("api_key").notNull(),
        apiUrl: text("api_url"), // Required for nzbdav, optional for others
        type: text("type", { enum: Object.values(AccountType) as [string, ...string[]] }).notNull(),
        name: text("name").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
    },
    (table) => [
        uniqueIndex("unique_user_account").on(table.userId, table.apiKey, table.type),
        index("user_accounts_userId_idx").on(table.userId),
    ]
);

// Addons table - stores user addon configurations
export const addons = pgTable(
    "addons",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        url: text("url").notNull(),
        enabled: boolean("enabled").notNull().default(true),
        order: integer("order").notNull().default(0),
    },
    (table) => [index("addons_userId_idx").on(table.userId)]
);

// User settings table - stores user preferences
export const userSettings = pgTable("user_settings", {
    userId: uuid("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),
    settings: jsonb("settings").notNull(),
});

// Relations
export const userRelations = relations(user, ({ many, one }) => ({
    userAccounts: many(userAccounts),
    addons: many(addons),
    userSettings: one(userSettings),
    profiles: many(profiles),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
    user: one(user, {
        fields: [profiles.userId],
        references: [user.id],
    }),
    watchProgress: many(watchProgress),
    favorites: many(favorites),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
    profile: one(profiles, {
        fields: [favorites.profileId],
        references: [profiles.id],
    }),
}));

export const watchProgressRelations = relations(watchProgress, ({ one }) => ({
    profile: one(profiles, {
        fields: [watchProgress.profileId],
        references: [profiles.id],
    }),
}));

export const userAccountsRelations = relations(userAccounts, ({ one }) => ({
    user: one(user, {
        fields: [userAccounts.userId],
        references: [user.id],
    }),
}));

export const addonsRelations = relations(addons, ({ one }) => ({
    user: one(user, {
        fields: [addons.userId],
        references: [user.id],
    }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
    user: one(user, {
        fields: [userSettings.userId],
        references: [user.id],
    }),
}));

// Cache warmer jobs table - tracks pre-caching status
export const cacheWarmerJobs = pgTable(
    "cache_warmer_jobs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        profileId: uuid("profile_id")
            .references(() => profiles.id, { onDelete: "cascade" }),
        mediaType: text("media_type", { enum: ["movie", "show"] }).notNull(),
        imdbId: text("imdb_id").notNull(),
        title: text("title").notNull(),
        // For TV shows
        season: integer("season"),
        episode: integer("episode"),
        // Job status
        status: text("status", { enum: ["pending", "searching", "caching", "cached", "failed", "not_found"] }).notNull().default("pending"),
        source: text("source"), // "usenet" or "torrent"
        sourceUrl: text("source_url"), // magnet or NZB URL
        debridService: text("debrid_service"), // which debrid service was used
        debridFileId: text("debrid_file_id"), // ID in the debrid service
        errorMessage: text("error_message"),
        // Timestamps
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at").notNull().defaultNow(),
        completedAt: timestamp("completed_at"),
    },
    (table) => [
        index("cache_warmer_userId_idx").on(table.userId),
        index("cache_warmer_profileId_idx").on(table.profileId),
        index("cache_warmer_status_idx").on(table.status),
        uniqueIndex("unique_cache_job").on(table.userId, table.imdbId, table.season, table.episode),
    ]
);

export const cacheWarmerJobsRelations = relations(cacheWarmerJobs, ({ one }) => ({
    user: one(user, {
        fields: [cacheWarmerJobs.userId],
        references: [user.id],
    }),
    profile: one(profiles, {
        fields: [cacheWarmerJobs.profileId],
        references: [profiles.id],
    }),
}));

// Type exports for TypeScript
export type UserAccount = typeof userAccounts.$inferSelect;
export type NewUserAccount = typeof userAccounts.$inferInsert;
export type Addon = typeof addons.$inferSelect;
export type NewAddon = typeof addons.$inferInsert;
export type UserSetting = typeof userSettings.$inferSelect;
export type NewUserSetting = typeof userSettings.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type WatchProgress = typeof watchProgress.$inferSelect;
export type NewWatchProgress = typeof watchProgress.$inferInsert;
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type CacheWarmerJob = typeof cacheWarmerJobs.$inferSelect;
export type NewCacheWarmerJob = typeof cacheWarmerJobs.$inferInsert;
