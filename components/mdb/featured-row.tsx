"use client";

import { memo } from "react";
import { type TraktMediaItem } from "@/lib/trakt";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollCarousel } from "@/components/common/scroll-carousel";
import { MediaCard } from "@/components/mdb/media-card";
import { useTraktTrendingMixed } from "@/hooks/use-trakt";
import { Flame } from "lucide-react";

interface FeaturedRowProps {
    limit?: number;
}

export const FeaturedRow = memo(function FeaturedRow({ limit = 10 }: FeaturedRowProps) {
    const { data: items, isLoading } = useTraktTrendingMixed(limit);

    const mixed = items?.mixed;

    if (isLoading) {
        return (
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <Flame className="size-4 text-orange-500" />
                    <h2 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
                        Trending Now
                    </h2>
                </div>
                <ScrollCarousel className="-mx-4 lg:mx-0">
                    <div className="flex gap-3 pt-1 pb-4 max-lg:px-4">
                        {Array.from({ length: limit }, (_, i) => (
                            <div key={i} className="shrink-0 w-[100px] sm:w-[120px]">
                                <Skeleton className="aspect-2/3 rounded-sm" />
                            </div>
                        ))}
                    </div>
                </ScrollCarousel>
            </section>
        );
    }

    if (!mixed || mixed.length === 0) {
        return null;
    }

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <Flame className="size-4 text-orange-500" />
                <h2 className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
                    Trending Now
                </h2>
            </div>
            <ScrollCarousel className="-mx-4 lg:mx-0">
                <div className="flex gap-3 pt-1 pb-4 max-lg:px-4">
                    {mixed.slice(0, limit).map((item: TraktMediaItem, index: number) => {
                        const media = item.movie || item.show;
                        const type = item.movie ? "movie" : "show";
                        if (!media) return null;

                        return (
                            <div key={`featured-${type}-${media.ids?.trakt || index}`} className="shrink-0 w-[100px] sm:w-[120px]">
                                <MediaCard
                                    media={media}
                                    type={type}
                                    rank={index + 1}
                                />
                            </div>
                        );
                    })}
                </div>
            </ScrollCarousel>
        </section>
    );
});
