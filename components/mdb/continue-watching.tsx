"use client";

import { memo } from "react";
import { useContinueWatching, useRemoveFromWatchProgress } from "@/hooks/use-profiles";
import type { WatchProgress } from "@/lib/db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Play, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ScrollCarousel } from "@/components/common/scroll-carousel";
import { SectionDivider } from "@/components/section-divider";

interface ContinueWatchingProps {
    profileId: string | null;
    className?: string;
}

interface ContinueWatchingItemProps {
    item: WatchProgress;
    onRemove: (imdbId: string) => void;
}

const ContinueWatchingItem = memo(function ContinueWatchingItem({
    item,
    onRemove,
}: ContinueWatchingItemProps) {
    const href = item.mediaType === "movie"
        ? `/movie/${item.imdbId}`
        : `/show/${item.imdbId}?season=${item.season || 1}&episode=${item.episode || 1}`;

    const progressPercent = Math.min(100, Math.max(0, item.progress || 0));

    return (
        <div className="group relative">
            <Link href={href} className="block">
                <div className="relative aspect-video rounded-sm overflow-hidden bg-muted/50">
                    {/* Poster/Backdrop */}
                    {item.posterUrl ? (
                        <Image
                            src={item.posterUrl}
                            alt={item.title}
                            fill
                            sizes="280px"
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <Clock className="size-8 text-muted-foreground/50" />
                        </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="size-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <Play className="size-6 text-white fill-white" />
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Title */}
                <div className="mt-2 space-y-0.5">
                    <h3 className="text-sm font-medium line-clamp-1">{item.title}</h3>
                    {item.mediaType === "show" && item.season && item.episode && (
                        <p className="text-xs text-muted-foreground">
                            S{String(item.season).padStart(2, "0")}E{String(item.episode).padStart(2, "0")}
                            {item.episodeTitle && ` · ${item.episodeTitle}`}
                        </p>
                    )}
                    {item.mediaType === "movie" && (
                        <p className="text-xs text-muted-foreground">
                            {Math.round(progressPercent)}% watched
                        </p>
                    )}
                </div>
            </Link>

            {/* Remove button */}
            <Button
                size="icon"
                variant="secondary"
                className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(item.imdbId);
                }}
            >
                <X className="size-3" />
            </Button>
        </div>
    );
});

const skeletonItems = Array.from({ length: 5 }, (_, i) => (
    <div key={i} className="space-y-2">
        <Skeleton className="aspect-video rounded-sm" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
    </div>
));

export const ContinueWatching = memo(function ContinueWatching({
    profileId,
    className,
}: ContinueWatchingProps) {
    const { data: items, isLoading } = useContinueWatching(profileId, 10);
    const removeFromWatchProgress = useRemoveFromWatchProgress();

    const handleRemove = (imdbId: string) => {
        if (!profileId) return;
        removeFromWatchProgress.mutate({ profileId, imdbId });
    };

    // Don't render if no profile or no items
    if (!profileId || (!isLoading && (!items || items.length === 0))) {
        return null;
    }

    return (
        <div className={cn("space-y-4", className)}>
            <SectionDivider label="Continue Watching" />

            <ScrollCarousel className="-mx-4 lg:mx-0">
                <div className="flex gap-4 pt-2 pb-4 max-lg:px-4">
                    {isLoading
                        ? skeletonItems
                        : items?.map((item) => (
                            <div key={item.id} className="w-[240px] md:w-[280px] shrink-0">
                                <ContinueWatchingItem item={item} onRemove={handleRemove} />
                            </div>
                        ))}
                </div>
            </ScrollCarousel>
        </div>
    );
});
