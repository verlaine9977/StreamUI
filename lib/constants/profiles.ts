// Profile colors for selection
export const PROFILE_COLORS = [
    "#6366f1", // Indigo
    "#ec4899", // Pink
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#8b5cf6", // Violet
    "#ef4444", // Red
    "#06b6d4", // Cyan
    "#84cc16", // Lime
];

// Profile avatars (emoji-based)
export const PROFILE_AVATARS = [
    "👤", "😀", "😎", "🎬", "🍿", "🎮", "🎵", "📺",
    "🦊", "🐱", "🐶", "🦁", "🐼", "🦄", "🐲", "👾",
];

export const MAX_PROFILES = 4;

// Age rating options for content filtering
export const AGE_RATINGS = [
    { value: null, label: "No Restriction", description: "All content" },
    { value: 7, label: "Kids (7+)", description: "G, TV-Y, TV-Y7" },
    { value: 12, label: "Older Kids (12+)", description: "PG, TV-PG" },
    { value: 15, label: "Teens (15+)", description: "PG-13, TV-14" },
    { value: 18, label: "Adults (18+)", description: "R, NC-17, TV-MA" },
] as const;

// Mapping of certifications to age ratings
export const CERTIFICATION_AGE_MAP: Record<string, number> = {
    // US Movie ratings (MPAA)
    "G": 7,
    "PG": 12,
    "PG-13": 15,
    "R": 18,
    "NC-17": 18,
    // US TV ratings
    "TV-Y": 7,
    "TV-Y7": 7,
    "TV-G": 7,
    "TV-PG": 12,
    "TV-14": 15,
    "TV-MA": 18,
    // UK ratings (BBFC)
    "U": 7,
    "12": 12,
    "12A": 12,
    "15": 15,
    "18": 18,
    // Common defaults
    "NR": 18,
    "Unrated": 18,
};
