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

        // Generate profile cards - simple colored boxes with names
        const profileItems = userProfiles.map((profile, index) => {
            const color = profile.color || PROFILE_COLORS[index % PROFILE_COLORS.length];
            const avatar = profile.avatar || "👤";

            return `
                <lockup onselect="selectProfile('${profile.id}', '${escapeXml(profile.name)}')">
                    <badge src="resource://button-rated" class="whiteColor" />
                    <title>${escapeXml(avatar)} ${escapeXml(profile.name)}</title>
                </lockup>`;
        }).join("\n");

        const tvml = wrapDocument(`
    <stackTemplate>
        <banner>
            <title>Who's Watching?</title>
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
        <button onselect="loadMainMenu()">
            <text>Continue</text>
        </button>
    </alertTemplate>`);

        return new NextResponse(tvml, {
            headers: { "Content-Type": "application/xml" },
            status: 500,
        });
    }
}
