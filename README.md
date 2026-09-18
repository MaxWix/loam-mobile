# Loam Mobile — Developer Guide

## Overview

Loam Mobile is the iOS app for [Loam](https://loam.ing), built with **React Native + Expo**.  
It is a pure frontend — all data, auth, and business logic lives in the existing **SvelteKit backend** deployed at `https://loam.ing`.  
The mobile app calls the same API routes the web app uses.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native via Expo (Managed Workflow, SDK 56) |
| Navigation | Expo Router (file-based, works like SvelteKit routes) |
| Auth | Supabase JS client (`@supabase/supabase-js`) |
| API calls | `fetch()` to `https://loam.ing/api/*` with Bearer token |
| State | React `useState` / `useContext` (no Redux) |
| Styling | React Native `StyleSheet` + shared `lib/theme.js` |
| Image upload | `expo-image-picker` + `expo-file-system/legacy` → base64 JSON |
| SVG rendering | `react-native-svg` + `react-native-svg-transformer` |
| Fonts | `expo-font` — Bricolage Grotesque + Host Grotesk |

---

## Prerequisites

Before you can run this project you need:

1. **Xcode** (Mac App Store) — full install, not just command line tools
2. **Node.js v18+** — use nvm: `nvm install 20 && nvm use 20`
3. **Expo CLI** — `npm install -g expo-cli eas-cli`
4. **Watchman** — `brew install watchman`

Verify everything is installed:

```bash
node --version      # should be v18+
watchman --version  # any version
xcode-select -p     # should return a path
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/MaxWix/loam-mobile.git
cd loam-mobile
```

### 2. Install dependencies

Always use `npx expo install` for new packages, not plain `npm install`.  
For initial setup:

```bash
npm install --legacy-peer-deps
```

### 3. Set up environment variables

Copy the example env file:

```bash
cp .env.example .env
```

Fill in your values — get these from the team:

```
EXPO_PUBLIC_API_URL=https://loam.ing
EXPO_PUBLIC_API_URL_LOCAL=http://<your-local-ip>:5173
EXPO_PUBLIC_SUPABASE_URL=<supabase project url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
```

> ⚠️ Never put secret keys in `.env`. The Supabase anon key and API URL are safe here because they are public-facing. Private keys (Spotify, Cloudinary, Resend) live only on the SvelteKit backend — the mobile app never calls those services directly.

### 4. Find your local IP (for local development)

When developing backend features locally, you need to point the mobile app at your local SvelteKit server instead of the deployed `loam.ing` URL.

Find your local IP:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for a value like `192.168.x.x` or `10.x.x.x`. Add it to `.env`:

```
EXPO_PUBLIC_API_URL_LOCAL=http://192.168.1.45:5173
```

> ⚠️ Your local IP changes when you switch WiFi networks. Re-run the command above and update `.env` each time.

### 5. Start your local SvelteKit server (if working on backend features)

In your SvelteKit project, run with the `--host` flag so the iOS Simulator can reach it:

```bash
npm run dev -- --host
```

This exposes the server on your local network. Without `--host` the simulator can't connect.

The `lib/config.js` file automatically uses `EXPO_PUBLIC_API_URL_LOCAL` in development and `EXPO_PUBLIC_API_URL` in production — you don't need to manually switch URLs.

### 6. Start the Expo dev server

```bash
npx expo start --clear
```

Then press **i** to open the iOS Simulator.

---

## Project Structure

```
loam-mobile/
├── app/                        # Screens (Expo Router — file = route)
│   ├── index.js                # Entry point / auth redirect
│   ├── _layout.js              # Root layout — loads fonts, handles auth routing
│   ├── onboarding/
│   │   ├── auth.js             # ✅ Welcome screen — login/signup choice
│   │   ├── welcome.js          # ✅ 4 onboarding slides (signup path only)
│   │   ├── signup.js           # ✅ Signup form
│   │   ├── login.js            # ✅ Login form
│   │   ├── profile-setup.js    # ✅ Username, display name, bio, photo
│   │   ├── education.js        # ✅ "Let's complete your profile" slide
│   │   ├── post-song.js        # ⬜ Step 1 of 3 — add a song (not built)
│   │   ├── post-book.js        # ⬜ Step 2 of 3 — add a book (not built)
│   │   ├── post-movie.js       # ⬜ Step 3 of 3 — add a movie (not built)
│   │   └── add-buds.js         # ⬜ Search and add initial buds (not built)
│   └── (app)/
│       ├── _layout.js          # Bottom tab navigator (Home / Post / Profile)
│       ├── feed.js             # ⬜ Placeholder only
│       ├── create-post.js      # ⬜ Placeholder only
│       ├── notifications.js    # ⬜ Not built
│       ├── profile.js          # ✅ Own profile — masonry grid, tabs, logout
│       └── profile/
│           └── edit.js         # ✅ Edit profile — name, username, bio, photo
├── lib/
│   ├── theme.js                # ✅ All design tokens — colors, typography, spacing
│   ├── config.js               # ✅ API_URL helper (dev vs prod)
│   ├── stores/
│   │   └── auth.js             # ✅ Supabase client + AuthProvider + useAuth hook
│   └── components/
│       ├── Button.js           # ✅ All variants + icon blob buttons
│       ├── ProfileImage.js     # ✅ Organic blob SVG shape
│       ├── ProfileDetails.js   # ✅ Profile header component
│       ├── ProfileItem.js      # ✅ Masonry grid card
│       └── Tabs.js             # ✅ Sliding indicator tabs (within screens)
├── assets/
│   ├── fonts/                  # Bricolage Grotesque + Host Grotesk TTF files
│   └── icons/                  # SVG icons
├── docs/
│   ├── MOBILE_DEV_GUIDE.md     # This file
│   └── CLAUDE_PROJECT_CONTEXT.md # Paste into Claude to get AI assistance
├── .env                        # Local env vars (never commit)
├── .env.example                # Committed template
└── app.json                    # Expo app config
```

---

## How the Backend Connection Works

The mobile app talks to the existing SvelteKit backend at `https://loam.ing`. Every API call includes the Supabase auth token in the header:

```javascript
import { API_URL } from '../lib/config';

const response = await fetch(`${API_URL}/api/feed`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
});
```

**Always import `API_URL` from `lib/config.js`** — never hardcode `https://loam.ing`. This ensures local development works correctly.

### When to call the backend vs Supabase directly

| Use backend (`API_URL/api/*`) | Use Supabase directly |
|---|---|
| Feed (has 72hr filter + connection logic) | Auth (signIn, signUp, signOut) |
| Creating posts (calls Spotify/TMDB/Books) | Reading/writing reactions |
| Image uploads (calls Cloudinary) | Reading/writing comments |
| Media search (Spotify/TMDB/Books) | Reading profile data |
| Anything involving secret keys | Accepting/denying bud requests |

---

## Auth Flow

1. App launches → checks for existing Supabase session in AsyncStorage
2. **No session** → redirect to `/onboarding/auth`
3. **Session, no username** → redirect to `/onboarding/profile-setup`
4. **Session, username, onboarding incomplete** → redirect to `/onboarding/education`
5. **Session, username, onboarding complete** → redirect to `/(app)/feed`
6. Session token stored in AsyncStorage, sent as `Authorization: Bearer <token>` on every API call

---

## Design System

Everything lives in `lib/theme.js`. **Always import from theme, never hardcode values.**

```javascript
import { colors, typography, buttons, inputs, layout, spacing, radius, fonts } from '../lib/theme';
```

**Font weights must use font family variants, not `fontWeight`:**

```javascript
// WRONG — fontWeight is ignored in React Native without the matching font file
{ fontFamily: fonts.display, fontWeight: '800' }

// CORRECT
{ fontFamily: fonts.displayExtraBold }
```

Available font variants: `display`, `displayMedium`, `displayBold`, `displayExtraBold`, `primary`, `primaryMedium`, `primaryBold`

---

## Key Differences from the Web App

| Web (SvelteKit) | Mobile (Expo) |
|---|---|
| `+page.svelte` files | `app/*.js` files |
| CSS / SCSS | `StyleSheet.create({})` + `lib/theme.js` |
| `<div>`, `<p>`, `<img>` | `<View>`, `<Text>`, `<Image>` |
| Browser cookies for auth | AsyncStorage + Authorization header |
| `goto('/feed')` | `router.replace('/feed')` |
| Svelte stores | React Context / useState |
| `on:click` | `onPress` |
| SVG as CSS background | `react-native-svg` with `<Svg>`, `<Path>` |

---

## Adding New Dependencies

Always use Expo's installer:

```bash
npx expo install <package-name>
```

If you get peer dependency errors:

```bash
npx expo install <package-name> -- --legacy-peer-deps
```

---

## Git Workflow

Same as the web app — feature branches + PRs. Mobile-specific rules:

1. **Never commit `.env`** — it contains your Supabase keys
2. **Don't run `expo prebuild`** unless the whole team knows — generates `ios/` folder that causes merge conflicts
3. **After pulling changes that add new packages**, always run `npm install --legacy-peer-deps`
4. **One person manages dependency upgrades** at a time
5. **Commit both `package.json` and `package-lock.json`** — lock file ensures identical dependency versions across machines

---

## Running on a Physical iPhone

SDK 56 requires the latest Expo Go. If Expo Go shows a version mismatch use the iOS Simulator instead (press `i` in the terminal) — this is the recommended dev environment anyway.

---

## Getting AI Assistance

A context file for Claude is at `docs/CLAUDE_PROJECT_CONTEXT.md`. Paste its contents into a new Claude chat and Claude will be fully oriented on the project — stack, structure, design decisions, what's built, and what's not.

---

## Deployment (App Store)

We use EAS (Expo Application Services) for builds and submissions. Do not run `eas build` without coordinating with the team first — it uses shared build minutes.
