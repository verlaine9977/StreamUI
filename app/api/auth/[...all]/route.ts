import { NextRequest, NextResponse } from "next/server";
import {
    verifyPassword,
    createSessionToken,
    setSessionCookie,
    clearSessionCookie,
    getSession,
    ensureUserExists,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    if (pathname === "/api/auth/login") {
        try {
            const body = await request.json();
            const { password } = body;

            if (!password || typeof password !== "string") {
                return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
            }

            if (!verifyPassword(password)) {
                return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
            }

            await ensureUserExists();

            const token = await createSessionToken();
            await setSessionCookie(token);

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error("Login error:", error);
            return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
        }
    }

    if (pathname === "/api/auth/logout") {
        await clearSessionCookie();
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    if (pathname === "/api/auth/session") {
        const session = await getSession();

        if (session) {
            return NextResponse.json({
                authenticated: true,
                session,
            });
        }

        return NextResponse.json({
            authenticated: false,
            session: null,
        });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
}
