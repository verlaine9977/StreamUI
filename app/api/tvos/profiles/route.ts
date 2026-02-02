import { NextRequest, NextResponse } from "next/server";
import { wrapDocument, escapeXml } from "@/lib/tvos/tvml";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SINGLE_USER } from "@/lib/auth";

// Default colors matching the web app
const PROFILE_COLORS = [
    "#6366f1", "#ec4899", "#10b981", "#f59e0b",
    "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16",
];

export async function GET(request: NextRequest) {
    // Get the actual public URL from forwarded headers
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;

    try {
        // Get user profiles
        const userProfiles = await db
            .select()
            .from(profiles)
            .where(eq(profiles.userId, SINGLE_USER.id))
            .orderBy(profiles.createdAt);

        if (userProfiles.length === 0) {
            const tvml = wrapDocument(`
    <alertTemplate>
        <title>No Profiles</title>
        <description>Create profiles in the StreamUI web app first.</description>
        <button onselect="loadMainMenu()">
            <text>Continue</text>
        </button>
    </alertTemplate>`);

            return new NextResponse(tvml, {
                headers: { "Content-Type": "application/xml" },
            });
        }

        // Generate profile lockups with colored backgrounds and emoji avatars
        const profileItems = userProfiles.map((profile, index) => {
            const color = profile.color || PROFILE_COLORS[index % PROFILE_COLORS.length];
            const avatar = profile.avatar || "👤";
            // Use placeholder.com for colored backgrounds with emoji overlay
            const imgUrl = `https://via.placeholder.com/300x300/${color.replace('#', '')}/ffffff?text=${encodeURIComponent(avatar)}`;

            return `
                <lockup onselect="selectProfile('${profile.id}', '${escapeXml(profile.name)}')">
                    <img src="${imgUrl}" width="180" height="180" style="tv-placeholder: tv; border-radius: 16" />
                    <title class="showTextOnHighlight">${escapeXml(profile.name)}</title>
                </lockup>`;
        }).join("\n");

        const tvml = wrapDocument(`
    <stackTemplate>
        <banner>
            <title>Who's Watching?</title>
            <subtitle>Select a profile to continue</subtitle>
        </banner>
        <collectionList>
            <shelf centered="true">
                <section>
                    ${profileItems}
                </section>
            </shelf>
        </collectionList>
    </stackTemplate>`);

        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
        });
    } catch (error) {
        console.error("Profiles error:", error);
        const tvml = wrapDocument(`
    <alertTemplate>
        <title>Error</title>
        <description>Failed to load profiles.</description>
        <button onselect="dismissModal()">
            <text>OK</text>
        </button>
    </alertTemplate>`);

        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
            status: 500,
        });
    }
}
