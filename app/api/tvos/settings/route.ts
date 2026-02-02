import { NextRequest, NextResponse } from "next/server";
import { wrapDocument, escapeXml } from "@/lib/tvos/tvml";

export async function GET(request: NextRequest) {
    const tvml = wrapDocument(`
    <listTemplate>
        <banner>
            <title>Settings</title>
        </banner>
        <list>
            <header>
                <title>StreamUI for Apple TV</title>
            </header>
            <section>
                <listItemLockup>
                    <title>Version</title>
                    <subtitle>1.0.0</subtitle>
                </listItemLockup>
                <listItemLockup>
                    <title>Server</title>
                    <subtitle>${escapeXml(request.nextUrl.origin)}</subtitle>
                </listItemLockup>
            </section>
            <header>
                <title>About</title>
            </header>
            <section>
                <listItemLockup>
                    <title>StreamUI</title>
                    <subtitle>A modern debrid client</subtitle>
                </listItemLockup>
                <listItemLockup>
                    <title>Author</title>
                    <subtitle>Adnan Ahmad</subtitle>
                </listItemLockup>
            </section>
        </list>
    </listTemplate>`);

    return new NextResponse(tvml, {
        headers: { "Content-Type": "application/xml" },
    });
}
