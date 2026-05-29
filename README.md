# Plexamp Web Visualizer

A stunning, responsive Node.js + HTML frontend that turns your Plexamp playback into a **spinning vinyl record** with beautiful modern UI elements.
The record shows the current album artwork, extracts dominant colors to paint the background dynamically, and spins in sync with your music. 🎶💿

---

## 🌟 Features
- Live album cover fetching from Plexamp
- Spinning vinyl effect with dynamic tonearm position
- Play/pause state perfectly synced with Plexamp
- Fully responsive UI (Desktop & Mobile optimized, dynamic sizing)
- Advanced color extraction for immersive ambient backgrounds
- **Robust Security**: Token-based authentication, Helmet HTTP headers, and strict rate limiting (DDoS protection)
- **Docker Ready**: Fully prepared to be deployed with Docker Compose.

---

## 🚀 Installation & Usage

### Method 1: Using Docker (Recommended)
This is the easiest and most secure method, especially if you plan to expose it to the internet via Cloudflare Tunnels.

1. Clone the repository:
   ```bash
   git clone https://github.com/JuanZagoR/Plexamp-Web-Visualizer.git
   cd Plexamp-Web-Visualizer
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your Plex details and create a secure `VIEWER_TOKEN` (see section below).
4. Run with Docker Compose:
   ```bash
   docker compose up -d
   ```
5. Open your browser: `http://localhost:3000/?token=YOUR_VIEWER_TOKEN`

### Method 2: Manual Node.js
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your details.
3. Start the server:
   ```bash
   npm start
   ```

---

## 🔒 Security Architecture (Cloudflare Ready)
To safely expose this visualizer to the internet without leaking your Plex token or allowing unauthorized proxying:

- The server uses a `.env` file to keep `PLEX_TOKEN` hidden from the codebase.
- The entire API and Frontend are protected by a custom `VIEWER_TOKEN` that you define in `.env`.
- To view the visualizer, you **must** append `?token=YOUR_VIEWER_TOKEN` to the URL.
- Global rate-limiting (300 req/min) prevents DDoS attacks and brute-force attempts.
- **Cloudflared Users**: The server automatically trusts the Cloudflare proxy (`trust proxy`) to properly handle rate-limiting per external IP.

---

## 🔑 How to get your Plex token
1. Open Plex Web App in your browser.
2. Start playback in Plexamp or Plex.
3. Press `F12` to open Developer Tools → go to the **Network** tab.
4. Look for a request to `/status/sessions`.
5. The URL contains `X-Plex-Token=...` → copy that value and paste it in your `.env` file.
