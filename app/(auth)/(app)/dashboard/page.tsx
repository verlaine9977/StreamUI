"use client";

import { MediaSection } from "@/components/mdb/media-section";
import { SearchDialog } from "@/components/mdb/search-dialog";
import { MdbFooter } from "@/components/mdb/mdb-footer";
import { SectionDivider } from "@/components/section-divider";
import { ContinueWatching } from "@/components/mdb/continue-watching";
import { FavoritesSection } from "@/components/mdb/favorites-section";
import { FeaturedRow } from "@/components/mdb/featured-row";
import { memo, useState } from "react";
import {
    useTraktTrendingMovies,
    useTraktTrendingShows,
    useTraktPopularMovies,
    useTraktPopularShows,
    useTraktMostWatchedMovies,
    useTraktMostWatchedShows,
    useTraktAnticipatedMovies,
    useTraktAnticipatedShows,
    useTraktBoxOfficeMovies,
    useTraktMostPlayedMovies,
    useTraktMostPlayedShows,
} from "@/hooks/use-trakt";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DISCORD_URL } from "@/lib/constants";
import Image from "next/image";
import { useProfileOptional } from "@/components/profile-provider";

const DashboardPage = memo(function DashboardPage() {
    const [searchOpen, setSearchOpen] = useState(false);
    const profileContext = useProfileOptional();
    const currentProfileId = profileContext?.currentProfile?.id || null;

    const trendingMovies = useTraktTrendingMovies(20);
    const trendingShows = useTraktTrendingShows(20);
    const popularMovies = useTraktPopularMovies(20);
    const popularShows = useTraktPopularShows(20);
    const mostWatchedMovies = useTraktMostWatchedMovies("weekly", 20);
    const mostWatchedShows = useTraktMostWatchedShows("weekly", 20);
    const anticipatedMovies = useTraktAnticipatedMovies(20);
    const anticipatedShows = useTraktAnticipatedShows(20);
    const boxOffice = useTraktBoxOfficeMovies();
    const mostPlayedMovies = useTraktMostPlayedMovies("weekly", 20);
    const mostPlayedShows = useTraktMostPlayedShows("weekly", 20);

    return (
        <div className="pb-8">
            {/* Featured Row - Compact trending posters */}
            <div className="lg:px-6 pt-2">
                <FeaturedRow limit={10} />
            </div>

            {/* Welcome Section */}
            <div className="py-8 lg:px-6">
                <div className="max-w-2xl mx-auto text-center space-y-4">
                    <div className="flex justify-center">
                        <Image
                            src="/logo.svg"
                            alt="StreamUI"
                            width={180}
                            height={40}
                            className="h-7 w-auto dark:invert opacity-90"
                            priority
                        />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
                        Discover and stream your favorite movies and TV shows. Browse trending content, manage your library, and enjoy instant playback.
                    </p>
                    {DISCORD_URL && (
                        <div className="flex items-center justify-center gap-3">
                            <Button size="sm" className="gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white" asChild>
                                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src="https://simpleicons.org/icons/discord.svg"
                                        alt=""
                                        className="size-3.5 invert"
                                    />
                                    <span>Join Community</span>
                                </a>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="py-8 lg:px-6">
                <button
                    onClick={() => setSearchOpen(true)}
                    className="w-full max-w-xl mx-auto flex items-center gap-3 h-12 px-4 text-sm text-muted-foreground bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-sm transition-colors">
                    <SearchIcon className="size-4" />
                    <span>Search movies and shows...</span>
                    <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-xs text-muted-foreground">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </button>
            </div>

            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

            {/* Content Sections */}
            <div className="lg:px-6 space-y-12">
                {/* Continue Watching */}
                <ContinueWatching profileId={currentProfileId} />

                {/* Favorites */}
                <FavoritesSection profileId={currentProfileId} />

                {/* Trending */}
                <div className="space-y-8">
                    <SectionDivider label="Trending Now" />

                    <MediaSection
                        title="Movies"
                        items={trendingMovies.data}
                        isLoading={trendingMovies.isLoading}
                        error={trendingMovies.error}
                        showRank={true}
                    />

                    <MediaSection
                        title="TV Shows"
                        items={trendingShows.data}
                        isLoading={trendingShows.isLoading}
                        error={trendingShows.error}
                        showRank={true}
                    />
                </div>

                {/* Popular */}
                <div className="space-y-8">
                    <SectionDivider label="Popular" />

                    <MediaSection
                        title="Movies"
                        items={popularMovies.data}
                        isLoading={popularMovies.isLoading}
                        error={popularMovies.error}
                    />

                    <MediaSection
                        title="TV Shows"
                        items={popularShows.data}
                        isLoading={popularShows.isLoading}
                        error={popularShows.error}
                    />
                </div>

                {/* Box Office */}
                <div className="space-y-8">
                    <SectionDivider label="Box Office" />

                    <MediaSection
                        title="Top Grossing"
                        items={boxOffice.data}
                        isLoading={boxOffice.isLoading}
                        error={boxOffice.error}
                    />
                </div>

                {/* Most Watched */}
                <div className="space-y-8">
                    <SectionDivider label="Most Watched This Week" />

                    <MediaSection
                        title="Movies"
                        items={mostWatchedMovies.data}
                        isLoading={mostWatchedMovies.isLoading}
                        error={mostWatchedMovies.error}
                    />

                    <MediaSection
                        title="TV Shows"
                        items={mostWatchedShows.data}
                        isLoading={mostWatchedShows.isLoading}
                        error={mostWatchedShows.error}
                    />
                </div>

                {/* Most Played */}
                <div className="space-y-8">
                    <SectionDivider label="Most Played This Week" />

                    <MediaSection
                        title="Movies"
                        items={mostPlayedMovies.data}
                        isLoading={mostPlayedMovies.isLoading}
                        error={mostPlayedMovies.error}
                    />

                    <MediaSection
                        title="TV Shows"
                        items={mostPlayedShows.data}
                        isLoading={mostPlayedShows.isLoading}
                        error={mostPlayedShows.error}
                    />
                </div>

                {/* Coming Soon */}
                <div className="space-y-8">
                    <SectionDivider label="Coming Soon" />

                    <MediaSection
                        title="Movies"
                        items={anticipatedMovies.data}
                        isLoading={anticipatedMovies.isLoading}
                        error={anticipatedMovies.error}
                    />

                    <MediaSection
                        title="TV Shows"
                        items={anticipatedShows.data}
                        isLoading={anticipatedShows.isLoading}
                        error={anticipatedShows.error}
                    />
                </div>

                <MdbFooter className="pt-8 border-t border-border/50" />
            </div>
        </div>
    );
});

export default DashboardPage;
