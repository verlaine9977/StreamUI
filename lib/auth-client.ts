"use client";

import { useState, useEffect } from "react";

interface Session {
    user: {
        id: string;
        name: string;
        email: string;
    };
}

interface SessionState {
    data: Session | null;
    isPending: boolean;
    error: Error | null;
}

export function useSession(): SessionState {
    const [state, setState] = useState<SessionState>({
        data: null,
        isPending: true,
        error: null,
    });

    useEffect(() => {
        async function checkSession() {
            try {
                const response = await fetch("/api/auth/session");
                if (response.ok) {
                    const data = await response.json();
                    setState({
                        data: data.authenticated ? data.session : null,
                        isPending: false,
                        error: null,
                    });
                } else {
                    setState({
                        data: null,
                        isPending: false,
                        error: null,
                    });
                }
            } catch (error) {
                setState({
                    data: null,
                    isPending: false,
                    error: error instanceof Error ? error : new Error("Failed to check session"),
                });
            }
        }

        checkSession();
    }, []);

    return state;
}

export async function signIn(password: string): Promise<{ success: boolean; error?: string }> {
    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            return { success: true };
        }

        return { success: false, error: data.error || "Login failed" };
    } catch {
        return { success: false, error: "An unexpected error occurred" };
    }
}

export async function signOut(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
}

export const authClient = {
    useSession,
    signIn,
    signOut,
};
