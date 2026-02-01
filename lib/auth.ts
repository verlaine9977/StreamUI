import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "streamui_session";
const SINGLE_USER_ID = "00000000-0000-0000-0000-000000000000";

function getJwtSecret(): Uint8Array {
    const secret = process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET or BETTER_AUTH_SECRET environment variable is required");
    }
    return new TextEncoder().encode(secret);
}

function getAppPassword(): string {
    const password = process.env.APP_PASSWORD;
    if (!password) {
        throw new Error("APP_PASSWORD environment variable is required");
    }
    return password;
}

export function verifyPassword(password: string): boolean {
    return password === getAppPassword();
}

export async function createSessionToken(): Promise<string> {
    const secret = getJwtSecret();

    const token = await new SignJWT({ userId: SINGLE_USER_ID })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("365d")
        .sign(secret);

    return token;
}

export async function verifySessionToken(token: string): Promise<{ userId: string } | null> {
    try {
        const secret = getJwtSecret();
        const { payload } = await jwtVerify(token, secret);

        if (payload.userId === SINGLE_USER_ID) {
            return { userId: SINGLE_USER_ID };
        }

        return null;
    } catch {
        return null;
    }
}

export async function getSession(): Promise<{ user: { id: string; name: string; email: string } } | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    const verified = await verifySessionToken(token);

    if (!verified) {
        return null;
    }

    return {
        user: {
            id: SINGLE_USER_ID,
            name: "Admin",
            email: "admin@localhost",
        },
    };
}

export async function setSessionCookie(token: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
    });
}

export async function clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

export async function ensureUserExists(): Promise<void> {
    const existingUser = await db.select().from(user).where(eq(user.id, SINGLE_USER_ID));

    if (existingUser.length === 0) {
        await db.insert(user).values({
            id: SINGLE_USER_ID,
            name: "Admin",
            email: "admin@localhost",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
}

export const SINGLE_USER = { id: SINGLE_USER_ID };
