"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useProfiles } from "@/hooks/use-profiles";
import { getCurrentProfileId, setCurrentProfileId, clearCurrentProfileId } from "@/hooks/use-profiles";
import type { Profile } from "@/lib/db/schema";

interface ProfileContextValue {
    currentProfile: Profile | null;
    profiles: Profile[];
    isLoading: boolean;
    selectProfile: (profileId: string) => void;
    switchProfile: () => void;
    isAdmin: boolean;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function useProfile() {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error("useProfile must be used within ProfileProvider");
    }
    return context;
}

// Hook that returns null if no profile context (for optional use)
export function useProfileOptional() {
    return useContext(ProfileContext);
}

interface ProfileProviderProps {
    children: ReactNode;
}

// Pages that don't require profile selection
const PUBLIC_PATHS = ["/profiles", "/onboarding", "/login"];

export function ProfileProvider({ children }: ProfileProviderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: profiles = [], isLoading: profilesLoading } = useProfiles();

    // Initialize from localStorage synchronously to avoid flicker
    const [currentProfileId, setCurrentProfileIdState] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        return getCurrentProfileId();
    });
    const isInitialized = typeof window !== "undefined";

    // Find current profile from profiles list
    const currentProfile = profiles.find((p) => p.id === currentProfileId) || null;

    // Check if current profile is admin (first profile or default profile)
    const isAdmin = currentProfile?.isDefault || (profiles.length > 0 && profiles[0]?.id === currentProfile?.id);

    // Handle profile selection
    const selectProfile = useCallback((profileId: string) => {
        setCurrentProfileId(profileId);
        setCurrentProfileIdState(profileId);
        router.push("/dashboard");
    }, [router]);

    // Switch to profile selection screen
    const switchProfile = useCallback(() => {
        clearCurrentProfileId();
        setCurrentProfileIdState(null);
        router.push("/profiles");
    }, [router]);

    // Redirect logic
    useEffect(() => {
        if (!isInitialized || profilesLoading) return;

        const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

        // If no profiles exist, don't redirect (let onboarding handle it)
        if (profiles.length === 0) return;

        // If on a protected path without a selected profile, redirect to profiles
        if (!isPublicPath && !currentProfile) {
            router.push("/profiles");
            return;
        }

        // If on profiles page with a valid profile already, could auto-redirect
        // But we let users choose to switch profiles
    }, [isInitialized, profilesLoading, profiles, currentProfile, pathname, router]);

    const isLoading = !isInitialized || profilesLoading;

    return (
        <ProfileContext.Provider
            value={{
                currentProfile,
                profiles,
                isLoading,
                selectProfile,
                switchProfile,
                isAdmin: isAdmin || false,
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
}
