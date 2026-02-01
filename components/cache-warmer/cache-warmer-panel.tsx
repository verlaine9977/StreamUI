"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    useCacheWarmerProgress,
    useCacheWarmerItems,
    useCacheWarmerJobs,
    useCreateCacheWarmerJobs,
    useProcessCacheWarmerJobs,
    useClearCacheWarmerJobs,
} from "@/hooks/use-cache-warmer";
import { useProfileOptional } from "@/components/profile-provider";
import { Flame, Trash2, Play, RefreshCw, Heart, Tv, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CacheWarmerPanelProps {
    className?: string;
}

export const CacheWarmerPanel = memo(function CacheWarmerPanel({ className }: CacheWarmerPanelProps) {
    const profileContext = useProfileOptional();
    const profileId = profileContext?.currentProfile?.id || null;

    const [includeFavorites, setIncludeFavorites] = useState(true);
    const [includeNextEpisodes, setIncludeNextEpisodes] = useState(true);

    const { data: items, isLoading: isLoadingItems } = useCacheWarmerItems(profileId);
    const { data: progress } = useCacheWarmerProgress(profileId);
    const { data: jobs, isLoading: isLoadingJobs } = useCacheWarmerJobs(profileId);

    const createJobs = useCreateCacheWarmerJobs();
    const processJobs = useProcessCacheWarmerJobs();
    const clearJobs = useClearCacheWarmerJobs();

    const isProcessing = createJobs.isPending || processJobs.isPending;

    const handleStartWarming = async () => {
        if (!profileId) return;

        // First create the jobs
        await createJobs.mutateAsync({
            profileId,
            includeFavorites,
            includeNextEpisodes,
            preferUsenet: true,
            maxConcurrent: 5,
        });

        // Then start processing
        await processJobs.mutateAsync(5);
    };

    const handleProcessMore = () => {
        processJobs.mutate(5);
    };

    const handleClear = () => {
        clearJobs.mutate(profileId || undefined);
    };

    if (!profileId) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Flame className="size-5 text-orange-500" />
                        Cache Warmer
                    </CardTitle>
                    <CardDescription>Select a profile to use cache warming</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const totalItems = (items?.favorites.length || 0) + (items?.nextEpisodes.length || 0);
    const progressPercent = progress && progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Flame className="size-5 text-orange-500" />
                    Cache Warmer
                </CardTitle>
                <CardDescription>
                    Pre-cache your favorites and upcoming episodes in your debrid service for instant playback
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Options */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="include-favorites" className="flex items-center gap-2">
                            <Heart className="size-4 text-red-500" />
                            Include Favorites
                            {!isLoadingItems && (
                                <Badge variant="secondary" className="ml-1">
                                    {items?.favorites.length || 0}
                                </Badge>
                            )}
                        </Label>
                        <Switch
                            id="include-favorites"
                            checked={includeFavorites}
                            onCheckedChange={setIncludeFavorites}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="include-next-episodes" className="flex items-center gap-2">
                            <Tv className="size-4 text-blue-500" />
                            Include Next Episodes
                            {!isLoadingItems && (
                                <Badge variant="secondary" className="ml-1">
                                    {items?.nextEpisodes.length || 0}
                                </Badge>
                            )}
                        </Label>
                        <Switch
                            id="include-next-episodes"
                            checked={includeNextEpisodes}
                            onCheckedChange={setIncludeNextEpisodes}
                        />
                    </div>
                </div>

                {/* Progress */}
                {progress && progress.total > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                                {progress.completed} / {progress.total}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <CheckCircle className="size-3 text-green-500" />
                                {progress.cached} cached
                            </span>
                            <span className="flex items-center gap-1">
                                <XCircle className="size-3 text-red-500" />
                                {progress.failed} failed
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="size-3 text-yellow-500" />
                                {progress.pending} pending
                            </span>
                            {progress.inProgress > 0 && (
                                <span className="flex items-center gap-1">
                                    <Loader2 className="size-3 animate-spin" />
                                    {progress.inProgress} processing
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        onClick={handleStartWarming}
                        disabled={isProcessing || totalItems === 0}
                        className="flex-1"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <Play className="size-4 mr-2" />
                                Start Warming
                            </>
                        )}
                    </Button>
                    {progress && progress.pending > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleProcessMore}
                            disabled={isProcessing}
                        >
                            <RefreshCw className={cn("size-4", isProcessing && "animate-spin")} />
                        </Button>
                    )}
                    {progress && progress.completed > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleClear}
                            disabled={clearJobs.isPending}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>

                {/* Job List */}
                {jobs && jobs.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Recent Jobs</h4>
                        <ScrollArea className="h-[200px] rounded-md border">
                            <div className="p-2 space-y-1">
                                {isLoadingJobs ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-10 w-full" />
                                    ))
                                ) : (
                                    jobs.slice(0, 20).map((job) => (
                                        <div
                                            key={job.id}
                                            className="flex items-center justify-between px-2 py-1.5 rounded-sm text-sm hover:bg-muted/50"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <StatusIcon status={job.status} />
                                                <span className="truncate">{job.title}</span>
                                                {job.season && job.episode && (
                                                    <Badge variant="outline" className="shrink-0">
                                                        S{job.season}E{job.episode}
                                                    </Badge>
                                                )}
                                            </div>
                                            <Badge
                                                variant={
                                                    job.status === "cached"
                                                        ? "default"
                                                        : job.status === "failed" || job.status === "not_found"
                                                        ? "destructive"
                                                        : "secondary"
                                                }
                                                className="shrink-0 ml-2"
                                            >
                                                {job.status}
                                            </Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case "cached":
            return <CheckCircle className="size-4 text-green-500 shrink-0" />;
        case "failed":
        case "not_found":
            return <XCircle className="size-4 text-red-500 shrink-0" />;
        case "searching":
        case "caching":
            return <Loader2 className="size-4 animate-spin shrink-0" />;
        default:
            return <Clock className="size-4 text-muted-foreground shrink-0" />;
    }
}
