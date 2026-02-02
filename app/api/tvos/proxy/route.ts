import { NextRequest, NextResponse } from "next/server";

// Proxy endpoint for video streams with Range request support
export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
        return new NextResponse("Missing url parameter", { status: 400 });
    }

    try {
        // Forward Range header if present (required for video seeking)
        const rangeHeader = request.headers.get("range");
        const headers: HeadersInit = {
            "User-Agent": "Mozilla/5.0 (AppleTV; CPU AppleTV OS 17_0 like Mac OS X) StreamUI/1.0",
            "Accept": "*/*",
        };

        if (rangeHeader) {
            headers["Range"] = rangeHeader;
        }

        const response = await fetch(url, { headers });

        if (!response.ok && response.status !== 206) {
            return new NextResponse(`Upstream error: ${response.status}`, { status: response.status });
        }

        // Build response headers
        const responseHeaders: Record<string, string> = {
            "Content-Type": response.headers.get("content-type") || "video/mp4",
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Expose-Headers": "Content-Length, Content-Range",
        };

        // Copy important headers from upstream
        const contentLength = response.headers.get("content-length");
        const contentRange = response.headers.get("content-range");

        if (contentLength) responseHeaders["Content-Length"] = contentLength;
        if (contentRange) responseHeaders["Content-Range"] = contentRange;

        return new NextResponse(response.body, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error("Proxy error:", error);
        return new NextResponse("Proxy error", { status: 500 });
    }
}
