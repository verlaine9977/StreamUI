import { NextRequest, NextResponse } from "next/server";
import { wrapDocument, escapeXml } from "@/lib/tvos/tvml";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SINGLE_USER } from "@/lib/auth";

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
        <button onselect="dismissModal()">
            <text>OK</text>
        </button>
    </alertTemplate>`);

            return new NextResponse(tvml, {
                headers: { "Content-Type": "application/xml" },
            });
        }

        // Generate profile grid
        const profileItems = userProfiles.map(profile => `
            <lockup onselect="selectProfile('${profile.id}', '${escapeXml(profile.name)}')">
                <badge src="resource://person" class="whiteColor" style="tv-tint-color: ${profile.color || '#e94560'}" />
                <title>${escapeXml(profile.name)}</title>
            </lockup>`).join("\n");

        const tvml = wrapDocument(`
    <stackTemplate>
        <banner>
            <title>Who's Watching?</title>
        </banner>
        <collectionList>
            <grid>
                <section>
                    ${profileItems}
                </section>
            </grid>
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
