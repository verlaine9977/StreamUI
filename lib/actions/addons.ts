"use server";

import { redirect } from "next/navigation";
import { getSession, SINGLE_USER } from "@/lib/auth";
import { db } from "@/lib/db";
import { addons } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { v7 as uuidv7 } from "uuid";
import { type Addon } from "@/lib/addons/types";

/**
 * Get all user addons from database
 */
export async function getUserAddons() {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    const userAddons = await db.select().from(addons).where(eq(addons.userId, SINGLE_USER.id)).orderBy(addons.order);

    return userAddons;
}

/**
 * Add a new addon
 */
export async function addAddon(addon: Omit<Addon, "id" | "order">) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    // Calculate next order atomically
    const [maxOrder] = await db
        .select({ max: sql<number>`COALESCE(MAX(${addons.order}), -1)` })
        .from(addons)
        .where(eq(addons.userId, SINGLE_USER.id));

    await db.insert(addons).values({
        id: uuidv7(),
        userId: SINGLE_USER.id,
        name: addon.name,
        url: addon.url,
        enabled: addon.enabled,
        order: (maxOrder?.max ?? -1) + 1,
    });

    revalidatePath("/", "layout");
    return { success: true };
}

/**
 * Remove an addon
 */
export async function removeAddon(addonId: string) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    await db.delete(addons).where(and(eq(addons.id, addonId), eq(addons.userId, SINGLE_USER.id)));

    revalidatePath("/", "layout");
    return { success: true };
}

/**
 * Toggle addon enabled status
 */
export async function toggleAddon(addonId: string, enabled: boolean) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    await db
        .update(addons)
        .set({ enabled })
        .where(and(eq(addons.id, addonId), eq(addons.userId, SINGLE_USER.id)));

    revalidatePath("/", "layout");
    return { success: true };
}

/**
 * Update addon orders (for reordering)
 * Uses temporary negative offset to avoid conflicts during swap
 */
export async function updateAddonOrders(updates: { id: string; order: number }[]) {
    const session = await getSession();

    if (!session) {
        redirect("/login");
    }

    await db.transaction(async (tx) => {
        // First, set all updated addons to temporary negative orders to avoid conflicts
        for (let i = 0; i < updates.length; i++) {
            await tx
                .update(addons)
                .set({ order: -(i + 1000) })
                .where(and(eq(addons.id, updates[i].id), eq(addons.userId, SINGLE_USER.id)));
        }

        // Then set to final orders
        for (const update of updates) {
            await tx
                .update(addons)
                .set({ order: update.order })
                .where(and(eq(addons.id, update.id), eq(addons.userId, SINGLE_USER.id)));
        }
    });

    revalidatePath("/", "layout");
    return { success: true };
}
