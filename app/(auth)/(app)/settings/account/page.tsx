"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/lib/auth-client";
import { PageHeader } from "@/components/page-header";
import { SectionDivider } from "@/components/section-divider";
import { UserCog } from "lucide-react";

export default function AccountPage() {
    const { data: session } = useSession();

    const userInitials =
        session?.user?.name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() || "A";

    return (
        <div className="mx-auto w-full max-w-4xl space-y-8 pb-16">
            <PageHeader icon={UserCog} title="Account" description="View your account information" />

            <section className="space-y-4">
                <SectionDivider label="Profile" />

                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 rounded-sm">
                        <AvatarFallback className="rounded-sm text-lg">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-light text-lg">{session?.user?.name || "Admin"}</p>
                        <p className="text-xs text-muted-foreground">{session?.user?.email || "admin@localhost"}</p>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <SectionDivider label="Authentication" />

                <div className="rounded-sm border border-border/50 p-4">
                    <p className="font-light">Password-based Authentication</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        This instance uses single-user password authentication. The password is configured via the
                        APP_PASSWORD environment variable.
                    </p>
                </div>
            </section>
        </div>
    );
}
