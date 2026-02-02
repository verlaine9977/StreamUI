import { NextRequest, NextResponse } from "next/server";
import { wrapDocument } from "@/lib/tvos/tvml";

export async function GET(_request: NextRequest) {
    // For now, show a placeholder. In a full implementation,
    // this would check for authentication and display files from debrid accounts.

    const tvml = wrapDocument(`
    <alertTemplate>
        <title>Files</title>
        <description>To browse your debrid cloud files, please set up your account in the StreamUI web app first.

Files will appear here once you have:
1. Added a debrid account (Real-Debrid, TorBox, etc.)
2. Uploaded some torrents or files

Visit the StreamUI web app to get started.</description>
        <button>
            <text>OK</text>
        </button>
    </alertTemplate>`);

    return new NextResponse(tvml, {
        headers: { "Content-Type": "application/xml" },
    });
}
