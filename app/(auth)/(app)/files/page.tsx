"use client";

import { FileExplorer } from "@/components/explorer/file-explorer";
import { useAuth, useAuthGuaranteed } from "@/components/auth/auth-provider";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ListOrdered, FolderOpen, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ServiceIcon } from "@/components/accounts/service-icon";
import { AccountType } from "@/lib/types";

const QUEUE_URL = "http://141.147.52.24:3000/queue";

export default function AccountPage() {
    const { currentAccount } = useAuthGuaranteed();
    const { userAccounts, switchAccount } = useAuth();
    const [activeTab, setActiveTab] = useState<"files" | "queue">("files");

    return (
        <div className="space-y-4">
            {/* Account switcher + Tab buttons */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <div className="flex gap-2">
                    <Button
                        variant={activeTab === "files" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveTab("files")}
                        className={cn("gap-2", activeTab !== "files" && "text-muted-foreground")}
                    >
                        <FolderOpen className="size-4" />
                        Files
                    </Button>
                    <Button
                        variant={activeTab === "queue" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setActiveTab("queue")}
                        className={cn("gap-2", activeTab !== "queue" && "text-muted-foreground")}
                    >
                        <ListOrdered className="size-4" />
                        Queue
                    </Button>
                </div>

                {/* Account Switcher */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <ServiceIcon type={currentAccount.type as AccountType} className="size-4" />
                            <span className="max-w-32 truncate">{currentAccount.name}</span>
                            <ChevronsUpDown className="size-3 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {userAccounts.map((account) => (
                            <DropdownMenuItem
                                key={account.id}
                                onClick={() => switchAccount(account.id)}
                                className="gap-2 cursor-pointer"
                            >
                                <ServiceIcon type={account.type as AccountType} className="size-4" />
                                <span>{account.name}</span>
                                {account.id === currentAccount.id && <Check className="size-4 ml-auto" />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content */}
            {activeTab === "files" && <FileExplorer key={currentAccount.id} />}
            {activeTab === "queue" && (
                <div className="rounded-sm border border-border/50 overflow-hidden">
                    <iframe
                        src={QUEUE_URL}
                        className="w-full h-[calc(100vh-200px)] min-h-[500px]"
                        title="Download Queue"
                    />
                </div>
            )}
        </div>
    );
}
