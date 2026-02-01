"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getCacheWarmerJobs,
    getCacheWarmerProgress,
    getCacheWarmerItems,
    createCacheWarmerJobs,
    processPendingCacheWarmerJobs,
    clearCacheWarmerJobs,
    deleteCacheWarmerJob,
    type CacheWarmerConfig,
} from "@/lib/actions/cache-warmer";

const CACHE_WARMER_KEY = ["cache-warmer"];

export function useCacheWarmerJobs(profileId: string | null) {
    return useQuery({
        queryKey: [...CACHE_WARMER_KEY, "jobs", profileId],
        queryFn: () => getCacheWarmerJobs(profileId),
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 10, // Refresh every 10 seconds while viewing
    });
}

export function useCacheWarmerProgress(profileId: string | null) {
    return useQuery({
        queryKey: [...CACHE_WARMER_KEY, "progress", profileId],
        queryFn: () => getCacheWarmerProgress(profileId),
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 10,
    });
}

export function useCacheWarmerItems(profileId: string | null) {
    return useQuery({
        queryKey: [...CACHE_WARMER_KEY, "items", profileId],
        queryFn: () => (profileId ? getCacheWarmerItems(profileId) : { favorites: [], nextEpisodes: [] }),
        enabled: !!profileId,
        staleTime: 1000 * 60, // 1 minute
    });
}

export function useCreateCacheWarmerJobs() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (config: CacheWarmerConfig) => createCacheWarmerJobs(config),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [...CACHE_WARMER_KEY, "jobs", variables.profileId] });
            queryClient.invalidateQueries({ queryKey: [...CACHE_WARMER_KEY, "progress", variables.profileId] });
        },
    });
}

export function useProcessCacheWarmerJobs() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (limit?: number) => processPendingCacheWarmerJobs(limit),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CACHE_WARMER_KEY });
        },
    });
}

export function useClearCacheWarmerJobs() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (profileId?: string) => clearCacheWarmerJobs(profileId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CACHE_WARMER_KEY });
        },
    });
}

export function useDeleteCacheWarmerJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobId: string) => deleteCacheWarmerJob(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CACHE_WARMER_KEY });
        },
    });
}
