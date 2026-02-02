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
var currentProfileId = null;
var currentProfileName = null;

App.onLaunch = function(options) {
    console.log("StreamUI tvOS launched");

    // Show profile picker first, then load main menu
    loadProfiles();
};

// Load profile picker
function loadProfiles() {
    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        if (request.status >= 200 && request.status < 300 && request.responseXML) {
            navigationDocument.pushDocument(request.responseXML);
        } else {
            // No profiles or error - go straight to menu
            loadMainMenu();
        }
    }, false);
    request.addEventListener("error", function() {
        loadMainMenu();
    }, false);
    request.open("GET", baseURL + "/api/tvos/profiles", true);
    request.send();
}

// Select a profile
function selectProfile(profileId, profileName) {
    currentProfileId = profileId;
    currentProfileName = profileName;
    console.log("Profile selected:", profileName);

    // Replace profile picker with main menu
    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        if (request.status >= 200 && request.status < 300 && request.responseXML) {
            var currentDoc = navigationDocument.documents[navigationDocument.documents.length - 1];
            navigationDocument.replaceDocument(request.responseXML, currentDoc);
        }
    }, false);
    request.open("GET", baseURL + "/api/tvos/menu", true);
    request.send();
}

// Switch profile - go back to profile picker
function switchProfile() {
    console.log("Switching profile");
    // Clear current profile
    currentProfileId = null;
    currentProfileName = null;

    // Load profile picker and replace everything
    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        if (request.status >= 200 && request.status < 300 && request.responseXML) {
            // Clear all documents and start fresh
            while (navigationDocument.documents.length > 0) {
                navigationDocument.popDocument();
            }
            navigationDocument.pushDocument(request.responseXML);
        }
    }, false);
    request.open("GET", baseURL + "/api/tvos/profiles", true);
    request.send();
}

// Load main menu directly
function loadMainMenu() {
    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        if (request.status >= 200 && request.status < 300 && request.responseXML) {
            if (navigationDocument.documents.length > 0) {
                var currentDoc = navigationDocument.documents[navigationDocument.documents.length - 1];
                navigationDocument.replaceDocument(request.responseXML, currentDoc);
            } else {
                navigationDocument.pushDocument(request.responseXML);
            }
        } else {
            showErrorAlert("Failed to load menu");
        }
    }, false);
    request.addEventListener("error", function() {
        showErrorAlert("Network error");
    }, false);
    request.open("GET", baseURL + "/api/tvos/menu", true);
    request.send();
}

// Simple error alert
function showErrorAlert(message) {
    var alertString = '<?xml version="1.0" encoding="UTF-8" ?><document theme="dark"><alertTemplate><title>Error</title><description>' + message + '</description><button><text>OK</text></button></alertTemplate></document>';
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

// Play a stream URL directly with native player
function playStream(url, title, description) {
    console.log("Playing stream:", url);

    try {
        var player = new Player();
        var playlist = new Playlist();

        var mediaItem = new MediaItem("video", url);
        mediaItem.title = title || "StreamUI";
        mediaItem.description = description || "";

        playlist.push(mediaItem);
        player.playlist = playlist;

        player.addEventListener("stateDidChange", function(event) {
            console.log("Player state:", event.state);
            if (event.state === "error") {
                showAlert("Playback Error", "Could not play this stream. The format may not be supported.");
            }
        });

        player.addEventListener("mediaItemDidChange", function(event) {
            console.log("Media item changed");
        });

        player.addEventListener("requestSeekToTime", function(event) {
            return event.requestedTime;
        });

        player.play();
    } catch (e) {
        console.error("Player error:", e);
        showAlert("Error", "Failed to start playback: " + (e.message || e));
    }
}

// Play with options - on tvOS we can only use native player
function playWithOptions(url, title, description) {
    console.log("Attempting to play:", url);

    if (!url) {
        showAlert("Error", "No stream URL available");
        return;
    }

    // Check if URL looks valid
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        showAlert("Unsupported Stream", "This stream type is not supported on Apple TV. The URL must be a direct HTTP link to a video file.");
        return;
    }

    playStream(url, title, description);
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
function menuItemSelected(event, url) {
    var menuItem = event.target;
    var feature = menuItem.parentNode.getFeature("MenuBarDocument");

    console.log("Menu item selected, loading:", url);

    var request = new XMLHttpRequest();
    request.responseType = "document";
    request.addEventListener("load", function() {
        console.log("Menu content loaded, status:", request.status);
        if (request.status >= 200 && request.status < 300) {
            var doc = request.responseXML;
            if (doc && feature) {
                console.log("Setting document for menu item");
                feature.setDocument(doc, menuItem);
            } else {
                console.error("No doc or feature", doc, feature);
            }
        }
    }, false);

    request.addEventListener("error", function(e) {
        console.error("Menu content load error:", e);
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
