"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsFavorite, useAddToFavorites, useRemoveFromFavorites } from "@/hooks/use-profiles";
import { useProfileOptional } from "@/components/profile-provider";

interface FavoriteButtonProps {
    imdbId: string;
    mediaType: "movie" | "show";
    title: string;
    year?: number;
    posterUrl?: string;
    slug?: string;
    tmdbId?: number;
    traktId?: number;
    variant?: "icon" | "default";
    className?: string;
}

export const FavoriteButton = memo(function FavoriteButton({
    imdbId,
    mediaType,
    title,
    year,
    posterUrl,
    slug,
    tmdbId,
    traktId,
    variant = "icon",
    className,
}: FavoriteButtonProps) {
    const profileContext = useProfileOptional();
    const profileId = profileContext?.currentProfile?.id || null;

    const { data: isFav, isLoading } = useIsFavorite(profileId, imdbId);
    const addToFavorites = useAddToFavorites();
    const removeFromFavorites = useRemoveFromFavorites();

    const isPending = addToFavorites.isPending || removeFromFavorites.isPending;

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!profileId || isPending) return;

        if (isFav) {
            removeFromFavorites.mutate({ profileId, imdbId });
        } else {
            addToFavorites.mutate({
                profileId,
                data: {
                    mediaType,
                    imdbId,
                    tmdbId,
                    traktId,
                    title,
                    year,
                    posterUrl,
                    slug,
                },
            });
        }
    };

    // Don't show if no profile
    if (!profileId) return null;

    if (variant === "icon") {
        return (
            <Button
                size="icon"
                variant="secondary"
                className={cn(
                    "size-8 rounded-full bg-black/60 backdrop-blur-sm border-0 hover:bg-black/80",
                    className
                )}
                onClick={handleClick}
                disabled={isLoading || isPending}
            >
                <Heart
                    className={cn(
                        "size-4 transition-all",
                        isFav ? "fill-red-500 text-red-500" : "text-white"
                    )}
                />
            </Button>
        );
    }

    return (
        <Button
            variant={isFav ? "secondary" : "outline"}
            className={cn("gap-2", className)}
            onClick={handleClick}
            disabled={isLoading || isPending}
        >
            <Heart
                className={cn(
                    "size-4",
                    isFav ? "fill-red-500 text-red-500" : ""
                )}
            />
            {isFav ? "Remove from Favorites" : "Add to Favorites"}
        </Button>
    );
});
