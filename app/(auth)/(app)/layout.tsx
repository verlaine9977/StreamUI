"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SearchProvider } from "@/components/mdb/search-provider";
import { Separator } from "@/components/ui/separator";
import { FilePreviewDialog } from "@/components/preview/file-preview-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { useProfileOptional } from "@/components/profile-provider";
import { useCreateProfile } from "@/hooks/use-profiles";
import { SplashScreen } from "@/components/splash-screen";

// App layout - requires at least one account and a selected profile
// Uses AuthProvider and ProfileProvider from parent (auth) layout
export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { userAccounts, currentAccount, currentUser, client } = useAuth();
    const profileContext = useProfileOptional();
    const createProfile = useCreateProfile();
    const hasCreatedDefaultProfile = useRef(false);

    const hasAccounts = userAccounts.length > 0;
    const hasProfiles = (profileContext?.profiles?.length || 0) > 0;
    const hasSelectedProfile = !!profileContext?.currentProfile;

    // Redirect to onboarding if no accounts
    useEffect(() => {
        if (!hasAccounts) {
            router.push("/onboarding");
        }
    }, [hasAccounts, router]);

    // Auto-create default profile if none exist
    useEffect(() => {
        if (
            hasAccounts &&
            !profileContext?.isLoading &&
            !hasProfiles &&
            !hasCreatedDefaultProfile.current &&
            !createProfile.isPending
        ) {
            hasCreatedDefaultProfile.current = true;
            createProfile.mutate({ name: "Admin", avatar: "👤" });
        }
    }, [hasAccounts, profileContext?.isLoading, hasProfiles, createProfile]);

    // Redirect to profiles if no profile selected (but has profiles)
    useEffect(() => {
        if (hasAccounts && hasProfiles && !hasSelectedProfile && !profileContext?.isLoading) {
            router.push("/profiles");
        }
    }, [hasAccounts, hasProfiles, hasSelectedProfile, profileContext?.isLoading, router]);

    // Single check for all required data to prevent flicker
    const isReady = hasAccounts && currentAccount && currentUser && client && hasSelectedProfile;
    if (!isReady) {
        return <SplashScreen />;
    }

    return (
        <SearchProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset className="overflow-x-hidden">
                    <header className="flex h-16 shrink-0 z-50 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                            <Breadcrumbs />
                        </div>
                    </header>
                    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">{children}</div>
                </SidebarInset>
            </SidebarProvider>
            <FilePreviewDialog />
        </SearchProvider>
    );
}
