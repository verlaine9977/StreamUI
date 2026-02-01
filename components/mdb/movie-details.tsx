"use client";

import { type TraktMedia } from "@/lib/trakt";
import { PeopleSection } from "./people-section";
import { Sources } from "./sources";
import { MediaHeader } from "./media-header";
import { SectionDivider } from "@/components/section-divider";
import { memo, useCallback } from "react";
import { useProfile } from "@/components/profile-provider";
import { useUpdateWatchProgress } from "@/hooks/use-profiles";
import { useQueryClient } from "@tanstack/react-query";

interface MovieDetailsProps {
    media: TraktMedia;
    mediaId: string;
}

export const MovieDetails = memo(function MovieDetails({ media, mediaId }: MovieDetailsProps) {
    const { currentProfile } = useProfile();
    const updateWatchProgress = useUpdateWatchProgress();
    const queryClient = useQueryClient();

    const posterUrl = media.images?.poster?.[0] ? `https://${media.images.poster[0]}` : undefined;

    // Track when playback starts (for Continue Watching)
    const handlePlaybackStart = useCallback(async () => {
        if (!currentProfile || !media.ids?.imdb) return;

        try {
            await updateWatchProgress.mutateAsync({
                profileId: currentProfile.id,
                data: {
                    mediaType: "movie",
                    imdbId: media.ids.imdb,
                    tmdbId: media.ids.tmdb,
                    title: media.title || "Unknown Movie",
                    posterUrl,
                    progress: 5, // Small progress to show it was started
                    duration: media.runtime ? media.runtime * 60 : undefined,
                },
            });
            queryClient.invalidateQueries({ queryKey: ["continue-watching", currentProfile.id] });
        } catch {
            // Silently fail - don't interrupt playback
        }
    }, [currentProfile, media, posterUrl, updateWatchProgress, queryClient]);

    return (
        <div className="space-y-12">
            <MediaHeader media={media} mediaId={mediaId} type="movie" />

            {media.ids?.imdb && (
                <section className="space-y-6">
                    <SectionDivider label="Available Sources" />
                    <div id="sources">
                        <Sources
                            imdbId={media.ids?.imdb}
                            mediaType="movie"
                            mediaTitle={media.title || "Movie"}
                            onPlaybackStart={handlePlaybackStart}
                        />
                    </div>
                </section>
            )}

            <section className="space-y-6">
                <SectionDivider label="Cast & Crew" />
                <PeopleSection mediaId={mediaId} type="movies" />
            </section>
        </div>
    );
});
