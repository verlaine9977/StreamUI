import { NextRequest, NextResponse } from "next/server";

// Main JavaScript file for tvOS app
// This is loaded by TVMLKit and handles all client-side logic

export async function GET(request: NextRequest) {
    // Get the actual public URL from forwarded headers (when behind reverse proxy)
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;

    const js = `
// StreamUI tvOS Application
// Loaded by TVMLKit

var baseURL = "${baseUrl}";

App.onLaunch = function(options) {
    console.log("StreamUI tvOS launched");
    console.log("Options:", JSON.stringify(options));
    console.log("baseURL:", baseURL);
    console.log("navigationDocument exists:", typeof navigationDocument !== "undefined");
    console.log("navigationDocument:", navigationDocument);

    // Load the main menu as the initial document
    var menuUrl = baseURL + "/api/tvos/menu";
    console.log("Loading menu from:", menuUrl);

    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        console.log("Menu request completed, status:", request.status);
        console.log("Response type:", request.responseType);

        if (request.status >= 200 && request.status < 300) {
            var doc = request.responseXML;
            console.log("Parsed document:", doc);

            if (doc) {
                console.log("Document root element:", doc.documentElement ? doc.documentElement.tagName : "none");

                // For the initial document, use pushDocument on navigationDocument
                if (typeof navigationDocument !== "undefined" && navigationDocument && navigationDocument.pushDocument) {
                    console.log("Pushing document to navigationDocument");
                    navigationDocument.pushDocument(doc);
                    console.log("Document pushed successfully");
                } else {
                    console.error("navigationDocument not available or missing pushDocument");
                    console.error("navigationDocument type:", typeof navigationDocument);
                }
            } else {
                console.error("Failed to parse XML response");
                showErrorAlert("Failed to parse menu response");
            }
        } else {
            console.error("HTTP error:", request.status, request.statusText);
            showErrorAlert("Failed to load menu (HTTP " + request.status + ")");
        }
    }, false);

    request.addEventListener("error", function(e) {
        console.error("Network error:", e);
        showErrorAlert("Network request failed");
    }, false);

    console.log("Sending menu request...");
    request.open("GET", menuUrl, true);
    request.send();
};

// Simple error alert for startup errors
function showErrorAlert(message) {
    var alertString = '<?xml version="1.0" encoding="UTF-8" ?><document><alertTemplate><title>Error</title><description>' + message + '</description><button><text>OK</text></button></alertTemplate></document>';
    var parser = new DOMParser();
    var alertDoc = parser.parseFromString(alertString, "application/xml");
    if (navigationDocument) {
        navigationDocument.presentModal(alertDoc);
    }
}

App.onResume = function(options) {
    console.log("StreamUI tvOS resumed");
};

App.onSuspend = function(options) {
    console.log("StreamUI tvOS suspended");
};

App.onError = function(error) {
    console.error("App error:", error);
    showAlert("Error", error.message || "An unknown error occurred");
};

// Load and push a TVML document from URL
function loadDocument(url) {
    console.log("Loading document:", url);

    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        if (request.status >= 200 && request.status < 300) {
            var doc = request.responseXML;
            if (doc && navigationDocument) {
                navigationDocument.pushDocument(doc);
            } else if (!doc) {
                showAlert("Error", "Failed to parse response");
            } else {
                console.error("navigationDocument not available");
            }
        } else {
            showAlert("Error", "Failed to load content (HTTP " + request.status + ")");
        }
    }, false);

    request.addEventListener("error", function() {
        showAlert("Error", "Network request failed");
    }, false);

    request.open("GET", url, true);
    request.send();
}

// Replace current document with new one
function replaceDocument(url) {
    console.log("Replacing document:", url);

    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        if (request.status >= 200 && request.status < 300) {
            var doc = request.responseXML;
            if (doc && navigationDocument && navigationDocument.documents) {
                var currentDoc = navigationDocument.documents[navigationDocument.documents.length - 1];
                navigationDocument.replaceDocument(doc, currentDoc);
            }
        }
    }, false);

    request.open("GET", url, true);
    request.send();
}

// Load dashboard
function loadDashboard() {
    loadDocument(baseURL + "/api/tvos/dashboard");
}

// Play media (movie or show)
function playMedia(type, slug) {
    console.log("Playing " + type + ":", slug);

    // First, fetch available sources
    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        if (request.status >= 200 && request.status < 300) {
            var doc = request.responseXML;
            if (doc) {
                navigationDocument.pushDocument(doc);
            }
        } else {
            showAlert("Error", "Failed to load sources");
        }
    }, false);

    request.open("GET", baseURL + "/api/tvos/sources/" + type + "/" + slug, true);
    request.send();
}

// Play a stream URL directly
function playStream(url, title, description) {
    console.log("Playing stream:", url);

    var player = new Player();
    var playlist = new Playlist();

    var mediaItem = new MediaItem("video", url);
    mediaItem.title = title || "StreamUI";
    mediaItem.description = description || "";

    playlist.push(mediaItem);
    player.playlist = playlist;

    player.addEventListener("stateDidChange", function(event) {
        console.log("Player state changed:", event.state);
    });

    player.addEventListener("mediaItemDidChange", function(event) {
        console.log("Media item changed");
    });

    player.play();
}

// Play trailer (YouTube URL)
function playTrailer(url) {
    console.log("Playing trailer:", url);

    // Extract YouTube video ID and construct playable URL
    var videoId = extractYouTubeId(url);
    if (videoId) {
        // For YouTube, we need to use a different approach
        // tvOS doesn't support YouTube directly, show alert with info
        showAlert("Trailer", "Open YouTube app to watch trailer:\\n" + url);
    } else {
        // Try to play directly if it's a direct video URL
        playStream(url, "Trailer", "");
    }
}

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
    var match = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([^&]+)/);
    return match ? match[1] : null;
}

// Search for content
function search(query) {
    if (!query || query.length < 2) {
        return;
    }

    console.log("Searching for:", query);
    loadDocument(baseURL + "/api/tvos/search?q=" + encodeURIComponent(query));
}

// Show alert dialog
function showAlert(title, message, buttons) {
    var alertString = \`<?xml version="1.0" encoding="UTF-8" ?>
    <document>
        <alertTemplate>
            <title>\${escapeXML(title)}</title>
            <description>\${escapeXML(message)}</description>
            <button>
                <text>OK</text>
            </button>
        </alertTemplate>
    </document>\`;

    var parser = new DOMParser();
    var alertDoc = parser.parseFromString(alertString, "application/xml");
    navigationDocument.presentModal(alertDoc);
}

// Dismiss modal
function dismissModal() {
    navigationDocument.dismissModal();
}

// Helper to escape XML
function escapeXML(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

// Menu bar item selection handler
function menuItemSelected(event) {
    var menuItem = event.target;
    var menuId = menuItem.getAttribute("id");
    var feature = menuItem.parentNode.getFeature("MenuBarDocument");

    console.log("Menu item selected:", menuId);

    var url;
    switch(menuId) {
        case "dashboard":
            url = baseURL + "/api/tvos/dashboard";
            break;
        case "search":
            url = baseURL + "/api/tvos/search";
            break;
        case "files":
            url = baseURL + "/api/tvos/files";
            break;
        case "settings":
            url = baseURL + "/api/tvos/settings";
            break;
        default:
            return;
    }

    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        if (request.status >= 200 && request.status < 300) {
            var doc = request.responseXML;
            if (doc && feature) {
                feature.setDocument(doc, menuItem);
            }
        }
    }, false);

    request.open("GET", url, true);
    request.send();
}

console.log("StreamUI tvOS JavaScript loaded");
`;

    return new NextResponse(js, {
        headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache",
        },
    });
}
