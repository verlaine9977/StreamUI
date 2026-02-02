import { NextRequest, NextResponse } from "next/server";

// Proxy endpoint for video streams
// This helps with CORS and adds proper headers for tvOS playback
export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing url parameter", { status: 400 });
    }

    try {
        // Fetch the video stream
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (AppleTV; CPU AppleTV OS 17_0 like Mac OS X) StreamUI/1.0",
                "Accept": "*/*",
                "Accept-Encoding": "identity", // Don't compress video
            },
        });

        if (!response.ok) {
            return new NextResponse(`Upstream error: ${response.status}`, { status: response.status });
        }

        // Get content type and length
        const contentType = response.headers.get("content-type") || "video/mp4";
        const contentLength = response.headers.get("content-length");

        // Create response headers
        const headers: Record<string, string> = {
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
        };

        if (contentLength) {
            headers["Content-Length"] = contentLength;
        }

        // Stream the response
        return new NextResponse(response.body, { headers });
    } catch (error) {
        console.error("Proxy error:", error);
        return new NextResponse("Proxy error", { status: 500 });
    }
}
