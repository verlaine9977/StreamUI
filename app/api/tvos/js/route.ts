import { NextRequest, NextResponse } from "next/server";

// Main JavaScript file for tvOS app
// This is loaded by TVMLKit and handles all client-side logic

export async function GET(request: NextRequest) {
    const baseUrl = request.nextUrl.origin;

    const js = `
// StreamUI tvOS Application
// Loaded by TVMLKit

var baseURL = "${baseUrl}";

// Global app reference
var navigationDocument;

App.onLaunch = function(options) {
    console.log("StreamUI tvOS launched");

    // Store navigation document reference
    navigationDocument = App.navigationDocument;

    // Load the main menu
    loadMainMenu();
};

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
            if (doc) {
                navigationDocument.pushDocument(doc);
            } else {
                showAlert("Error", "Failed to parse response");
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
            if (doc) {
                var currentDoc = navigationDocument.documents[navigationDocument.documents.length - 1];
                navigationDocument.replaceDocument(doc, currentDoc);
            }
        }
    }, false);

    request.open("GET", url, true);
    request.send();
}

// Load main menu with tabs
function loadMainMenu() {
    loadDocument(baseURL + "/api/tvos/menu");
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
