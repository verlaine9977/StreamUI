"use client";

import { useProfileOptional } from "@/components/profile-provider";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfileSwitcher() {
    const profileContext = useProfileOptional();
    const { isMobile } = useSidebar();

    if (!profileContext) return null;

    const { currentProfile, profiles, selectProfile, switchProfile } = profileContext;

    if (!currentProfile) return null;

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            {/* Profile Avatar */}
                            <div
                                className="flex size-8 items-center justify-center rounded-lg text-lg"
                                style={{ backgroundColor: currentProfile.color || "#6366f1" }}
                            >
                                {currentProfile.avatar || "👤"}
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{currentProfile.name}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {currentProfile.traktUsername ? `@${currentProfile.traktUsername}` : "Profile"}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Switch Profile
                        </DropdownMenuLabel>
                        {profiles.map((profile) => (
                            <DropdownMenuItem
                                key={profile.id}
                                onClick={() => selectProfile(profile.id)}
                                className={cn(
                                    "gap-2 p-2",
                                    profile.id === currentProfile.id && "bg-accent"
                                )}
                            >
                                <div
                                    className="flex size-6 items-center justify-center rounded text-sm"
                                    style={{ backgroundColor: profile.color || "#6366f1" }}
                                >
                                    {profile.avatar || "👤"}
                                </div>
                                <span>{profile.name}</span>
                                {profile.isDefault && (
                                    <span className="ml-auto text-xs text-muted-foreground">Admin</span>
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={switchProfile} className="gap-2">
                            <Users className="size-4" />
                            Manage Profiles
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
