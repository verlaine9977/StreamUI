"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback, startTransition } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useUserAccounts, useDebridUserInfo, useRemoveUserAccount } from "@/hooks/use-user-accounts";
import type { UserAccount } from "@/lib/db";
import type { User } from "@/lib/types";
import { getClientInstance } from "@/lib/clients";
import type { DebridClient } from "@/lib/clients";
import { SplashScreen } from "@/components/splash-screen";
import { SplashErrorScreen } from "@/components/splash-error-screen";
import { useRouter } from "next/navigation";
import { clearAppCache } from "@/lib/utils";
import { toast } from "sonner";

interface AuthContextType {
    session: { user: { id: string; name: string; email: string } } | null;
    userAccounts: UserAccount[];
    currentAccount: UserAccount | null;
    currentUser: User | null;
    client: DebridClient | null;
    isLoading: boolean;
    isLoggingOut: boolean;
    switchAccount: (accountId: string) => void;
    refetchAccounts: () => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}

export function useAuthGuaranteed() {
    const { currentAccount, currentUser, client, ...rest } = useAuth();

    if (!currentAccount || !currentUser || !client) {
        throw new Error("useAuthGuaranteed can only be used in private routes");
    }

    return { currentAccount, currentUser, client, ...rest };
}

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const router = useRouter();
    const { data: session, isPending: isSessionPending, error: sessionError } = useSession();
    const { data: userAccounts = [], isLoading: isAccountsLoading, refetch } = useUserAccounts(!!session);

    const accountsLength = userAccounts.length;

    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const currentAccountId = useMemo(() => {
        if (accountsLength === 0) return null;

        if (selectedAccountId && userAccounts.some((acc) => acc.id === selectedAccountId)) {
            return selectedAccountId;
        }

        const savedId = typeof window !== "undefined" ? localStorage.getItem("selected-account-id") : null;
        if (savedId && userAccounts.some((acc) => acc.id === savedId)) {
            return savedId;
        }

        return userAccounts[0].id;
    }, [accountsLength, selectedAccountId, userAccounts]);

    const currentAccount = useMemo(
        () => userAccounts.find((acc) => acc.id === currentAccountId) || null,
        [userAccounts, currentAccountId]
    );

    const {
        data: currentUser = null,
        isLoading: isLoadingUser,
        isError: isUserError,
        error: userError,
        refetch: refetchUser,
    } = useDebridUserInfo(currentAccount);

    const { mutate: removeAccount } = useRemoveUserAccount();

    useEffect(() => {
        if (!isSessionPending && !session) {
            router.push("/login");
        }
    }, [session, isSessionPending, router]);

    useEffect(() => {
        if (currentAccountId) {
            localStorage.setItem("selected-account-id", currentAccountId);
        }
    }, [currentAccountId]);

    const client = useMemo(() => {
        if (!currentUser) return null;
        return getClientInstance(currentUser);
    }, [currentUser]);

    const switchAccount = useCallback((accountId: string) => {
        localStorage.setItem("selected-account-id", accountId);
        startTransition(() => {
            setSelectedAccountId(accountId);
        });
    }, []);

    const logout = useCallback(async () => {
        setIsLoggingOut(true);
        const toastId = toast.loading("Logging out...");
        try {
            await clearAppCache();
            await signOut();

            toast.success("Logged out successfully", { id: toastId });
            router.push("/login");
        } catch (error) {
            toast.error("Failed to logout", { id: toastId });
            console.error("Error logging out:", error);
        } finally {
            setIsLoggingOut(false);
        }
    }, [router]);

    const contextValue = useMemo<AuthContextType>(
        () => ({
            session,
            userAccounts,
            currentAccount,
            currentUser,
            client,
            isLoading: isSessionPending || isAccountsLoading || isLoadingUser,
            isLoggingOut,
            switchAccount,
            refetchAccounts: refetch,
            logout,
        }),
        [
            session,
            userAccounts,
            currentAccount,
            currentUser,
            client,
            isSessionPending,
            isAccountsLoading,
            isLoadingUser,
            isLoggingOut,
            switchAccount,
            refetch,
            logout,
        ]
    );

    if (sessionError) {
        return (
            <SplashErrorScreen
                title="Session Error"
                error={sessionError instanceof Error ? sessionError : new Error("Failed to verify session")}
                onRetry={() => window.location.reload()}
            />
        );
    }

    if (isSessionPending || !session || isAccountsLoading || (accountsLength > 0 && isLoadingUser)) {
        return <SplashScreen />;
    }

    if (isUserError && currentAccount) {
        return (
            <SplashErrorScreen
                title="Debrid Account Error"
                error={userError}
                onRetry={refetchUser}
                onDelete={() => removeAccount(currentAccount.id)}
                onLogout={logout}
            />
        );
    }

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
