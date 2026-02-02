import { NextRequest, NextResponse } from "next/server";

// Main menu with tab bar navigation
export async function GET(request: NextRequest) {
    // Get the actual public URL from forwarded headers (when behind reverse proxy)
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;

    const tvml = `<?xml version="1.0" encoding="UTF-8" ?>
<document theme="dark">
    <menuBarTemplate>
        <menuBar>
            <menuItem id="dashboard" autoHighlight="true" onselect="menuItemSelected(event, '${baseUrl}/api/tvos/dashboard')">
                <title>Home</title>
            </menuItem>
            <menuItem id="search" onselect="menuItemSelected(event, '${baseUrl}/api/tvos/search')">
                <title>Search</title>
            </menuItem>
            <menuItem id="files" onselect="menuItemSelected(event, '${baseUrl}/api/tvos/files')">
                <title>Files</title>
            </menuItem>
            <menuItem id="settings" onselect="menuItemSelected(event, '${baseUrl}/api/tvos/settings')">
                <title>Settings</title>
            </menuItem>
        </menuBar>
    </menuBarTemplate>
</document>`;

    return new NextResponse(tvml, {
        headers: {
            "Content-Type": "application/xml",
        },
    });
}
