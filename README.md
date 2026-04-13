# Focus Contractor


A commitment-based focus app built for ADHD brains.

Define your task. State what is at stake. Enter a protected focus zone. Leave early and the contract breaks.

## Features

- **Task setup** — 19 suggested tasks, saved custom tasks, or type your own
- **Three session modes** — Lock-In (instant fail on exit), Companion (asked why before failing), Phone-Down (minimal UI)
- **Planned sessions** — Schedule sessions ahead of time, start them with one tap from the dashboard
- **Impact statement** — Written before every session, shown again if you fail
- **Get to it later** — Notes box during sessions so distractions don't derail you
- **Completion log** — Mandatory achievement input when a session ends
- **Insights** — Completion rate, streaks, failure patterns, best session lengths, output categories
- **PWA** — Installable on mobile from the browser

## Tech

- React 18
- Vite 5
- vite-plugin-pwa
- localStorage (no backend, no account required)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
```

Output goes to `dist/`. Deploy to Vercel, Netlify, or any static host.

## Deploy to Vercel

```bash
npx vercel
```

Or connect the GitHub repo in the Vercel dashboard. No environment variables needed.

## PWA Icons

Add `icon-192.png` and `icon-512.png` to the `/public` folder for full PWA install support. A placeholder SVG icon is included at `/public/icon.svg`.

## Project Structure

```
focus-contractor/
├── public/
│   ├── manifest.json    # PWA manifest
│   └── icon.svg         # Placeholder icon
├── src/
│   ├── App.jsx          # Entire application
│   └── main.jsx         # React entry point
├── index.html
├── vite.config.js
└── package.json
```
