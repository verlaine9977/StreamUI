import { NextRequest, NextResponse } from "next/server";

// Main menu with tab bar navigation
export async function GET(_request: NextRequest) {

    const tvml = `<?xml version="1.0" encoding="UTF-8" ?>
<document>
    <menuBarTemplate>
        <menuBar>
            <menuItem id="dashboard" autoHighlight="true">
                <title>Home</title>
            </menuItem>
            <menuItem id="search">
                <title>Search</title>
            </menuItem>
            <menuItem id="files">
                <title>Files</title>
            </menuItem>
            <menuItem id="settings">
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
