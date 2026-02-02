import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import { Analytics } from "@/components/analytics";

const siteConfig = {
    name: "StreamUI",
    description:
        "A modern debrid client with multi-account support, integrated media discovery, real-time file tracking, and direct streaming to your favorite media players.",
    url: "https://debridui.viperadnan.com",
    ogImage: "/banner.jpg",
    keywords: [
        "debrid",
        "debrid ui",
        "debrid client",
        "real debrid",
        "torbox",
        "alldebrid",
        "file manager",
        "media streaming",
        "download manager",
        "trakt",
        "media discovery",
    ],
};

export const metadata: Metadata = {
    metadataBase: new URL(siteConfig.url),
    alternates: {
        canonical: "/",
    },
    title: {
        default: siteConfig.name,
        template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: siteConfig.keywords,
    authors: [{ name: "Adnan Ahmad", url: "https://viperadnan.com" }],
    creator: "Adnan Ahmad",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: siteConfig.name,
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        type: "website",
        locale: "en_US",
        url: siteConfig.url,
        title: siteConfig.name,
        description: siteConfig.description,
        siteName: siteConfig.name,
        images: [
            {
                url: siteConfig.ogImage,
                width: 1200,
                height: 630,
                alt: siteConfig.name,
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: siteConfig.name,
        description: siteConfig.description,
        images: [siteConfig.ogImage],
        creator: "@viperadn",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    icons: {
        icon: [
            { url: "/icon.svg", type: "image/svg+xml" },
            { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: "/apple-touch-icon.png",
    },
};

const font = localFont({
    src: [
        {
            path: "../public/fonts/Styrene-B-Regular.woff2",
            style: "normal",
            weight: "400",
        },
        {
            path: "../public/fonts/Styrene-B-Bold.woff2",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-sans",
    display: "swap",
});

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="preload" href="/logo.svg" as="image" type="image/svg+xml" />
                <meta name="theme-color" content="#000000" />
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body className={cn(font.className, "antialiased")}>
                <Providers>{children}</Providers>
                <Analytics />
            </body>
        </html>
    );
}
