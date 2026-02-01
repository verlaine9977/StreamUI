"use client";

import { type TraktEpisode } from "@/lib/trakt";
import { ChevronDown, Star, Check, Loader2 } from "lucide-react";
import { cn, formatLocalizedDate } from "@/lib/utils";
import { memo, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sources } from "./sources";
import { useProfile } from "@/components/profile-provider";
import { useUpdateWatchProgress, useShowWatchProgress } from "@/hooks/use-profiles";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface EpisodeCardProps {
    episode: TraktEpisode;
    className?: string;
    imdbId?: string;
    showTitle?: string;
    posterUrl?: string;
    defaultOpen?: boolean;
}

export const EpisodeCard = memo(function EpisodeCard({ episode, className, imdbId, showTitle, posterUrl, defaultOpen = false }: EpisodeCardProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const { currentProfile } = useProfile();
    const updateWatchProgress = useUpdateWatchProgress();
    const queryClient = useQueryClient();
    const { data: showWatchProgress = [] } = useShowWatchProgress(currentProfile?.id || null, imdbId || null);

    // Check if this episode is already watched (completed)
    const isWatched = showWatchProgress.some(
        (item) => item.season === episode.season && item.episode === episode.number && item.completed
    );

    const handleMarkWatched = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentProfile || !imdbId) return;

        try {
            await updateWatchProgress.mutateAsync({
                profileId: currentProfile.id,
                data: {
                    mediaType: "show",
                    imdbId,
                    title: showTitle || "Unknown Show",
                    posterUrl,
                    season: episode.season,
                    episode: episode.number,
                    episodeTitle: episode.title,
                    progress: 100,
                },
            });
            // Invalidate the show watch progress to refresh the watched status
            queryClient.invalidateQueries({ queryKey: ["show-watch-progress", currentProfile.id, imdbId] });
            toast.success(`Marked S${episode.season}E${episode.number} as watched`);
        } catch {
            toast.error("Failed to mark episode as watched");
        }
    };

    // Track when playback starts (for Continue Watching)
    const handlePlaybackStart = async () => {
        if (!currentProfile || !imdbId || isWatched) return;

        try {
            await updateWatchProgress.mutateAsync({
                profileId: currentProfile.id,
                data: {
                    mediaType: "show",
                    imdbId,
                    title: showTitle || "Unknown Show",
                    posterUrl,
                    season: episode.season,
                    episode: episode.number,
                    episodeTitle: episode.title,
                    progress: 5, // Small progress to show it was started
                    duration: episode.runtime ? episode.runtime * 60 : undefined,
                },
            });
            queryClient.invalidateQueries({ queryKey: ["continue-watching", currentProfile.id] });
        } catch {
            // Silently fail - don't interrupt playback
        }
    };

    const episodeLabel = String(episode.number).padStart(2, "0");
    const screenshotUrl = episode.images?.screenshot?.[0]
        ? `https://${episode.images.screenshot[0]}`
        : `https://placehold.co/400x225/1a1a1a/white?text=E${episodeLabel}`;

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("group", className)}>
            <div className="rounded-sm border border-border/50 overflow-hidden">
                <CollapsibleTrigger asChild>
                    <button className="w-full text-left block cursor-pointer">
                        <div className="flex flex-col sm:flex-row">
                            {/* Episode thumbnail */}
                            <div className="relative w-full sm:w-48 md:w-56 shrink-0 aspect-video bg-muted/30 overflow-hidden">
                                <img
                                    src={screenshotUrl}
                                    alt={episode.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-hover"
                                    loading="lazy"
                                />

                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                {/* Episode number - editorial style */}
                                <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                                    <span className="text-xs font-medium tracking-wider text-white/90 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-sm">
                                        E{episodeLabel}
                                    </span>
                                    {isWatched && (
                                        <span className="flex items-center justify-center text-xs font-medium text-white bg-emerald-600/90 backdrop-blur-sm px-1.5 py-1 rounded-sm">
                                            <Check className="size-3" />
                                        </span>
                                    )}
                                </div>

                                {/* Rating - minimal style */}
                                {episode.rating && (
                                    <div className="absolute top-2.5 right-2.5">
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-sm">
                                            <Star className="size-3 fill-[#F5C518] text-[#F5C518]" />
                                            {episode.rating.toFixed(1)}
                                        </span>
                                    </div>
                                )}

                                {/* Hover action */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span className="text-xs tracking-wider uppercase text-white bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-sm">
                                        {isOpen ? "Hide" : "Sources"}
                                    </span>
                                </div>
                            </div>

                            {/* Episode details */}
                            <div className="flex-1 p-4 space-y-2 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1 min-w-0">
                                        <h4 className="text-sm font-medium line-clamp-1 group-hover:text-foreground/80 transition-colors">
                                            {episode.title || `Episode ${episode.number}`}
                                        </h4>

                                        {/* Metadata - editorial separator style */}
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {episode.first_aired && (
                                                <span>{formatLocalizedDate(episode.first_aired)}</span>
                                            )}
                                            {episode.first_aired && episode.runtime && (
                                                <span className="text-border">·</span>
                                            )}
                                            {episode.runtime && <span>{episode.runtime}m</span>}
                                        </div>
                                    </div>

                                    <ChevronDown
                                        className={cn(
                                            "size-4 shrink-0 text-muted-foreground transition-transform duration-300",
                                            isOpen && "rotate-180"
                                        )}
                                    />
                                </div>

                                {episode.overview && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {episode.overview}
                                    </p>
                                )}
                            </div>
                        </div>
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    {isOpen && imdbId && (
                        <div className="border-t border-border/50 bg-muted/20">
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="text-xs tracking-widest uppercase text-muted-foreground">
                                    Available Sources
                                </span>
                                <Button
                                    size="sm"
                                    variant={isWatched ? "secondary" : "outline"}
                                    onClick={handleMarkWatched}
                                    disabled={updateWatchProgress.isPending || isWatched}
                                    className="gap-1.5 h-7 text-xs"
                                >
                                    {updateWatchProgress.isPending ? (
                                        <Loader2 className="size-3 animate-spin" />
                                    ) : (
                                        <Check className="size-3" />
                                    )}
                                    {isWatched ? "Watched" : "Mark Watched"}
                                </Button>
                            </div>
                            <Sources
                                imdbId={imdbId}
                                mediaType="show"
                                tvParams={
                                    episode.season ? { season: episode.season, episode: episode.number } : undefined
                                }
                                mediaTitle={
                                    showTitle && episode.season
                                        ? `${showTitle} S${episode.season.toString().padStart(2, "0")} E${episode.number.toString().padStart(2, "0")}${episode.title ? ` - ${episode.title}` : ""}`
                                        : episode.title || `Episode ${episode.number}`
                                }
                                onPlaybackStart={handlePlaybackStart}
                                className="border-x-0 border-b-0 rounded-none"
                            />
                        </div>
                    )}
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
});
