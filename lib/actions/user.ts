"use server";

import { getSession } from "@/lib/auth";

/**
 * Set password - not applicable for simple password auth
 */
export async function setPassword(_newPassword: string) {
    const session = await getSession();

    if (!session) {
        return { success: false, error: "Not authenticated" };
    }

    // Password is set via APP_PASSWORD environment variable
    return { success: false, error: "Password must be set via APP_PASSWORD environment variable" };
}
