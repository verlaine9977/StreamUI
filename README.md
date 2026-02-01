# StreamUI

<p align="center">
  <img src="public/logo.svg" alt="StreamUI Logo" width="200" />
</p>

<p align="center">
  A modern, fast debrid client with integrated media discovery, Usenet streaming, and seamless playback.
</p>

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/github/package-json/dependency-version/viperadnan-git/debridui/next?logo=next.js&logoColor=white&label=Next.js&color=black" alt="Next.js" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/github/package-json/dependency-version/viperadnan-git/debridui/dev/typescript?logo=typescript&logoColor=white&label=TypeScript&color=3178C6" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/github/package-json/dependency-version/viperadnan-git/debridui/dev/tailwindcss?logo=tailwind-css&logoColor=white&label=Tailwind&color=06B6D4" alt="Tailwind CSS" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/viperadnan-git/debridui?color=blue" alt="License" /></a>
</p>

---

## Table of Contents

- [Features](#features)
- [Supported Services](#supported-services)
- [Installation](#installation)
- [Docker Deployment](#docker-deployment)
- [Configuration](#configuration)
- [Feature Details](#feature-details)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Multi-Service Support
- **Real-Debrid** - Premium link generator and torrent downloading
- **TorBox** - Torrent and Usenet downloading service
- **AllDebrid** - Multi-hoster and torrent service
- **Premiumize** - Cloud downloading and streaming
- **nzbdav** - Usenet streaming via SABnzbd-compatible API

### Media Discovery & Streaming
- **Trakt.tv Integration** - Browse trending, popular, and anticipated movies/TV shows
- **Smart Search** - Search across all configured Stremio addons
- **Episode Browser** - Navigate TV shows by season and episode
- **Direct Streaming** - Stream to VLC, IINA, MPV, PotPlayer, Kodi, Infuse, MX Player
- **Multiple Sources** - Compare quality, size, and source for each title

### Profile System
- **Multiple Profiles** - Create up to 4 profiles (like Netflix)
- **Continue Watching** - Track progress across movies and TV shows
- **Favorites** - Save your favorite movies and shows
- **Watch History** - Automatic progress tracking
- **Next Episode** - Automatically shows next episode after completion

### Cache Warmer
- **Pre-caching** - Automatically cache next 2 episodes
- **Background Processing** - Queue and process cache jobs
- **Multi-source Support** - Works with Usenet and torrent sources
- **Smart Selection** - Prioritizes Usenet URLs, then cached torrents

### File Management
- **Multi-account Switching** - Switch between accounts on the fly
- **Real-time Progress** - Live download status updates
- **Tree View Explorer** - Hierarchical file browsing
- **Batch Operations** - Select and manage multiple files
- **Drag & Drop** - Upload torrents and magnet links easily

### User Experience
- **Dark/Light Mode** - Automatic theme switching
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Keyboard Shortcuts** - Cmd/Ctrl+K for quick search
- **Auto-refresh** - Configurable refresh intervals

---

## Supported Services

| Service | Torrents | Usenet | Web Downloads | Streaming |
|---------|----------|--------|---------------|-----------|
| Real-Debrid | ✅ | ❌ | ✅ | ✅ |
| TorBox | ✅ | ✅ | ✅ | ✅ |
| AllDebrid | ✅ | ❌ | ✅ | ✅ |
| Premiumize | ✅ | ❌ | ✅ | ✅ |
| nzbdav | ❌ | ✅ | ❌ | ✅ |

---

## Installation

### Prerequisites

- Node.js 20+ or Bun
- PostgreSQL 14+
- A debrid account (or nzbdav for Usenet)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/verlaine9977/StreamUI.git
cd StreamUI

# Install dependencies
bun install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your settings

# Set up database
bunx drizzle-kit push

# Run development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the app.

---

## Docker Deployment

### Using Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  debridui:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://debridui:debridui@postgres:5432/debridui
      - APP_PASSWORD=YourSecurePassword
      - BETTER_AUTH_SECRET=your-secret-key-min-32-chars
      - TRAKT_CLIENT_ID=your-trakt-client-id
      - TRAKT_CLIENT_SECRET=your-trakt-client-secret
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: debridui
      POSTGRES_PASSWORD: debridui
      POSTGRES_DB: debridui
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `APP_PASSWORD` | Yes | Password for login |
| `BETTER_AUTH_SECRET` | Yes | Secret key for auth (min 32 chars) |
| `TRAKT_CLIENT_ID` | Yes | Trakt.tv API client ID |
| `TRAKT_CLIENT_SECRET` | Yes | Trakt.tv API client secret |
| `NEXT_PUBLIC_CORS_PROXY_URL` | No | CORS proxy for addons |
| `NEXT_PUBLIC_DISCORD_URL` | No | Discord community link |

---

## Configuration

### Adding Accounts

1. Go to **Settings** → **Accounts** → **Add Account**
2. Select account type
3. Enter API key (and API URL for nzbdav)
4. Click **Add Account**

### nzbdav Setup

nzbdav is a SABnzbd-compatible API for Usenet streaming. To use it:

1. Set up [usenetstreamer](https://github.com/your-usenetstreamer) or similar
2. Get the API key from the service
3. Add account with:
   - **Type**: nzbdav
   - **API Key**: Your API key
   - **API URL**: `http://your-server:port` (e.g., `http://nzbdav:3000`)

### Stremio Addons

1. Go to **Settings** → **Addons**
2. Click **Add Addon**
3. Enter the addon manifest URL
4. Enable/disable and reorder as needed

---

## Feature Details

### Continue Watching

The continue watching feature tracks your progress across all media:

- **Automatic Tracking**: Progress is saved when you start watching
- **Resume Playback**: Click to continue from where you left off
- **Episode Navigation**: For TV shows, clicking goes directly to the episode
- **Next Episode**: When you finish an episode, the next one appears automatically
- **Remove Items**: Click the X to remove from continue watching

### Cache Warmer

Pre-cache content for instant playback:

1. Go to **Settings** → **Cache Warmer**
2. Select options:
   - **Include Favorites**: Cache movies from your favorites
   - **Include Next Episodes**: Cache next 2 episodes from continue watching
3. Click **Start Caching**
4. Monitor progress in the panel

**How it works:**
- Searches configured addons for sources
- Prioritizes Usenet/URL sources (instant streaming)
- Falls back to magnet links (adds to debrid cache)
- For Usenet: triggers the NZB download to start caching

### Profiles

Create multiple profiles for different users:

1. Click profile icon in sidebar
2. **Add Profile**: Set name, avatar, and color
3. **Switch Profiles**: Click to switch between profiles
4. Each profile has separate:
   - Continue watching
   - Favorites
   - Watch history

### File Explorer

Navigate your debrid files:

- **Tree View**: Hierarchical folder structure
- **Search**: Filter files by name
- **Sort**: By name, size, or date
- **Actions**:
  - Stream to player
  - Copy download link
  - Delete file
  - Batch select

### Media Players

Supported external players:

| Player | Platforms | Protocol |
|--------|-----------|----------|
| VLC | All | `vlc://` |
| IINA | macOS | `iina://` |
| MPV | All | `mpv://` |
| PotPlayer | Windows | `potplayer://` |
| Infuse | macOS/iOS | `infuse://` |
| Kodi | All | Custom |
| MX Player | Android | Intent |

---

## API Reference

### Client Methods

All debrid clients implement these core methods:

```typescript
interface DebridClient {
  // Torrent operations
  addMagnetLinks(uris: string[]): Promise<Record<string, DebridFileAddStatus>>;
  uploadTorrentFiles(files: File[]): Promise<Record<string, DebridFileAddStatus>>;
  findTorrents(query: string): Promise<DebridFile[]>;
  getTorrentList(params: { offset?: number; limit?: number }): Promise<DebridFileList>;
  removeTorrent(id: string): Promise<string>;

  // File operations
  getTorrentFiles(id: string): Promise<DebridFileNode[]>;
  getDownloadLink(params: { fileNode: DebridFileNode }): Promise<DebridLinkInfo>;

  // Web downloads
  addWebDownloads(links: string[]): Promise<WebDownloadAddResult[]>;
  getWebDownloadList(params: { offset: number; limit: number }): Promise<WebDownloadList>;
  deleteWebDownload(id: string): Promise<void>;
}
```

### Server Actions

Key server actions for data operations:

```typescript
// Profiles
getProfiles(): Promise<Profile[]>
createProfile(data: ProfileData): Promise<Profile>
updateProfile(id: string, data: ProfileData): Promise<Profile>
deleteProfile(id: string): Promise<void>

// Watch Progress
updateWatchProgress(profileId: string, data: WatchData): Promise<WatchProgress>
getContinueWatching(profileId: string, limit?: number): Promise<WatchProgress[]>

// Favorites
addToFavorites(profileId: string, data: FavoriteData): Promise<Favorite>
removeFromFavorites(profileId: string, imdbId: string): Promise<void>
getFavorites(profileId: string, limit?: number): Promise<Favorite[]>

// Cache Warmer
createCacheWarmerJobs(config: CacheWarmerConfig): Promise<{ created: number }>
processCacheWarmerJob(jobId: string): Promise<CacheWarmerJob | null>
getCacheWarmerProgress(profileId: string): Promise<CacheWarmerProgress>
```

---

## Database Schema

### Tables

- **user** - Authentication and user data
- **user_accounts** - Debrid service accounts (API keys)
- **profiles** - User profiles (up to 4 per user)
- **watch_progress** - Continue watching tracking
- **favorites** - Saved movies and shows
- **addons** - Stremio addon configurations
- **cache_warmer_jobs** - Pre-caching job queue

### Migrations

Migrations are in the `drizzle/` folder:

```bash
# Apply migrations
bunx drizzle-kit push

# Generate new migration
bunx drizzle-kit generate
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun run lint` to check for errors
5. Submit a pull request

---

## Disclaimer

> **Important Legal Notice**: This project is a client interface only and does not host, store, or distribute any content. Users are solely responsible for ensuring their use complies with all applicable laws, copyright regulations, and third-party service terms.

---

## License

GPL-3.0-or-later - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [Trakt.tv](https://trakt.tv) for media metadata
- [Stremio](https://stremio.com) addon ecosystem
- Original [StreamUI](https://github.com/viperadnan-git/debridui) by viperadnan
