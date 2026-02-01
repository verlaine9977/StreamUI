"use client";

import { memo } from "react";
import { useFavorites, useRemoveFromFavorites } from "@/hooks/use-profiles";
import type { Favorite } from "@/lib/db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ScrollCarousel } from "@/components/common/scroll-carousel";
import { SectionDivider } from "@/components/section-divider";

interface FavoritesSectionProps {
    profileId: string | null;
    className?: string;
}

interface FavoriteItemProps {
    item: Favorite;
    onRemove: (imdbId: string) => void;
}

const FavoriteItem = memo(function FavoriteItem({
    item,
    onRemove,
}: FavoriteItemProps) {
    const href = item.mediaType === "movie"
        ? `/movie/${item.slug || item.imdbId}`
        : `/show/${item.slug || item.imdbId}`;

    return (
        <div className="group relative">
            <Link href={href} className="block">
                <div className="relative aspect-2/3 rounded-sm overflow-hidden bg-muted/50">
                    {item.posterUrl ? (
                        <Image
                            src={item.posterUrl}
                            alt={item.title}
                            fill
                            sizes="(max-width: 640px) 100px, 120px"
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <Heart className="size-8 text-muted-foreground/50" />
                        </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Content on hover */}
                    <div className="absolute inset-x-0 bottom-0 p-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <h3 className="font-medium text-xs text-white leading-tight line-clamp-2">
                            {item.title}
                        </h3>
                        {item.year && (
                            <p className="text-xs text-white/70 mt-0.5">{item.year}</p>
                        )}
                    </div>
                </div>
            </Link>

            {/* Remove button */}
            <Button
                size="icon"
                variant="secondary"
                className="absolute top-1 right-1 size-5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 border-0"
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

const skeletonItems = Array.from({ length: 10 }, (_, i) => (
    <div key={i} className="shrink-0 w-[100px] sm:w-[120px]">
        <Skeleton className="aspect-2/3 rounded-sm" />
    </div>
));

export const FavoritesSection = memo(function FavoritesSection({
    profileId,
    className,
}: FavoritesSectionProps) {
    const { data: items, isLoading } = useFavorites(profileId, 20);
    const removeFromFavorites = useRemoveFromFavorites();

    const handleRemove = (imdbId: string) => {
        if (!profileId) return;
        removeFromFavorites.mutate({ profileId, imdbId });
    };

    // Don't render if no profile or no items
    if (!profileId || (!isLoading && (!items || items.length === 0))) {
        return null;
    }

    return (
        <div className={cn("space-y-4", className)}>
            <SectionDivider label="My Favorites" />

            <ScrollCarousel className="-mx-4 lg:mx-0">
                <div className="flex gap-3 pt-2 pb-4 max-lg:px-4">
                    {isLoading
                        ? skeletonItems
                        : items?.map((item) => (
                            <div key={item.id} className="shrink-0 w-[100px] sm:w-[120px]">
                                <FavoriteItem item={item} onRemove={handleRemove} />
                            </div>
                        ))}
                </div>
            </ScrollCarousel>
        </div>
    );
});
