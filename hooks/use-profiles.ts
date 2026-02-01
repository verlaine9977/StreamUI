"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getProfiles,
    getProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    getContinueWatching,
    updateWatchProgress,
    removeFromWatchProgress,
    disconnectProfileTrakt,
    getShowWatchProgress,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
} from "@/lib/actions/profiles";

const PROFILES_KEY = ["profiles"];
const CONTINUE_WATCHING_KEY = ["continue-watching"];

export function useProfiles() {
    return useQuery({
        queryKey: PROFILES_KEY,
        queryFn: () => getProfiles(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useProfile(profileId: string | null) {
    return useQuery({
        queryKey: [...PROFILES_KEY, profileId],
        queryFn: () => (profileId ? getProfile(profileId) : null),
        enabled: !!profileId,
    });
}

export function useCreateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: { name: string; avatar?: string; color?: string; maxAgeRating?: number | null }) => createProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROFILES_KEY });
        },
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ profileId, data }: { profileId: string; data: { name?: string; avatar?: string; color?: string; maxAgeRating?: number | null } }) =>
            updateProfile(profileId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROFILES_KEY });
        },
    });
}

export function useDeleteProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (profileId: string) => deleteProfile(profileId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROFILES_KEY });
        },
    });
}

export function useSetDefaultProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (profileId: string) => setDefaultProfile(profileId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROFILES_KEY });
        },
    });
}

export function useDisconnectTrakt() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (profileId: string) => disconnectProfileTrakt(profileId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROFILES_KEY });
        },
    });
}

// Continue Watching hooks
export function useContinueWatching(profileId: string | null, limit = 10) {
    return useQuery({
        queryKey: [...CONTINUE_WATCHING_KEY, profileId, limit],
        queryFn: () => (profileId ? getContinueWatching(profileId, limit) : []),
        enabled: !!profileId,
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useUpdateWatchProgress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            profileId,
            data,
        }: {
            profileId: string;
            data: {
                mediaType: "movie" | "show";
                imdbId: string;
                tmdbId?: number;
                title: string;
                posterUrl?: string;
                season?: number;
                episode?: number;
                episodeTitle?: string;
                progress: number;
                duration?: number;
            };
        }) => updateWatchProgress(profileId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [...CONTINUE_WATCHING_KEY, variables.profileId] });
        },
    });
}

export function useRemoveFromWatchProgress() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ profileId, imdbId }: { profileId: string; imdbId: string }) =>
            removeFromWatchProgress(profileId, imdbId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [...CONTINUE_WATCHING_KEY, variables.profileId] });
        },
    });
}

const SHOW_WATCH_PROGRESS_KEY = ["show-watch-progress"];

export function useShowWatchProgress(profileId: string | null, imdbId: string | null) {
    return useQuery({
        queryKey: [...SHOW_WATCH_PROGRESS_KEY, profileId, imdbId],
        queryFn: () => (profileId && imdbId ? getShowWatchProgress(profileId, imdbId) : []),
        enabled: !!profileId && !!imdbId,
        staleTime: 1000 * 60, // 1 minute
    });
}

// Favorites hooks
const FAVORITES_KEY = ["favorites"];

export function useFavorites(profileId: string | null, limit = 50) {
    return useQuery({
        queryKey: [...FAVORITES_KEY, profileId, limit],
        queryFn: () => (profileId ? getFavorites(profileId, limit) : []),
        enabled: !!profileId,
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useIsFavorite(profileId: string | null, imdbId: string | null) {
    return useQuery({
        queryKey: [...FAVORITES_KEY, "check", profileId, imdbId],
        queryFn: () => (profileId && imdbId ? isFavorite(profileId, imdbId) : false),
        enabled: !!profileId && !!imdbId,
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useAddToFavorites() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            profileId,
            data,
        }: {
            profileId: string;
            data: {
                mediaType: "movie" | "show";
                imdbId: string;
                tmdbId?: number;
                traktId?: number;
                title: string;
                year?: number;
                posterUrl?: string;
                slug?: string;
            };
        }) => addToFavorites(profileId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [...FAVORITES_KEY, variables.profileId] });
            queryClient.invalidateQueries({ queryKey: [...FAVORITES_KEY, "check", variables.profileId, variables.data.imdbId] });
        },
    });
}

export function useRemoveFromFavorites() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ profileId, imdbId }: { profileId: string; imdbId: string }) =>
            removeFromFavorites(profileId, imdbId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [...FAVORITES_KEY, variables.profileId] });
            queryClient.invalidateQueries({ queryKey: [...FAVORITES_KEY, "check", variables.profileId, variables.imdbId] });
        },
    });
}

// Profile storage for client-side current profile selection
const CURRENT_PROFILE_KEY = "streamui_current_profile";

export function getCurrentProfileId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CURRENT_PROFILE_KEY);
}

export function setCurrentProfileId(profileId: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(CURRENT_PROFILE_KEY, profileId);
}

export function clearCurrentProfileId(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(CURRENT_PROFILE_KEY);
}
