"use client";

import * as React from "react";
import { useMemo } from "react";

import { NavMain } from "@/components/sidebar/nav-main";
import { NavUser } from "@/components/sidebar/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar";
import { ProfileSwitcher } from "./profile-switcher";
import { FolderOpen, SearchIcon, HomeIcon, SettingsIcon, UsersIcon, Puzzle, Link2 } from "lucide-react";
import { useSearch } from "@/components/mdb/search-provider";
import { useProfileOptional } from "@/components/profile-provider";

const allNavItems = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: HomeIcon,
    },
    {
        title: "Search",
        url: "/search",
        icon: SearchIcon,
    },
    {
        title: "Files",
        url: "/files",
        icon: FolderOpen,
    },
    {
        title: "Links",
        url: "/links",
        icon: Link2,
    },
    {
        title: "Addons",
        url: "/addons",
        icon: Puzzle,
        adminOnly: true,
    },
    {
        title: "Accounts",
        url: "/accounts",
        icon: UsersIcon,
        adminOnly: true,
    },
    {
        title: "Settings",
        url: "/settings",
        icon: SettingsIcon,
    },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { toggle: toggleSearch } = useSearch();
    const profileContext = useProfileOptional();

    const isAdmin = profileContext?.isAdmin ?? true;

    // Filter nav items based on admin status
    const navItems = useMemo(() => {
        return allNavItems.filter((item) => !item.adminOnly || isAdmin);
    }, [isAdmin]);

    const handleNavAction = (action?: string) => {
        if (action === "search") {
            toggleSearch();
        }
    };

    return (
        <Sidebar collapsible={"icon"} {...props}>
            <SidebarContent>
                <NavMain items={navItems} onAction={handleNavAction} />
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border/50">
                <ProfileSwitcher />
                <NavUser />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
