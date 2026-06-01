# Loam Mobile — Developer Guide

## Overview

Loam Mobile is the iOS app for [Loam](https://loam.ing), built with **React Native + Expo**.  
It is a pure frontend — all data, auth, and business logic lives in the existing **SvelteKit backend** deployed at `https://loam.ing`.  
The mobile app calls the same API routes the web app uses. No backend changes are required to work on the mobile app.

---

## Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Framework  | React Native via Expo (Managed Workflow, SDK 56)      |
| Navigation | Expo Router (file-based, works like SvelteKit routes) |
| Auth       | Supabase JS client (`@supabase/supabase-js`)          |
| API calls  | `fetch()` to `https://loam.ing/api/*`                 |
| State      | React `useState` / `useContext` (no Redux)            |
| Styling    | React Native `StyleSheet`                             |

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
git clone <repo-url>
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
EXPO_PUBLIC_SUPABASE_URL=<supabase project url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
```

> ⚠️ Never put secret keys in `.env`. The Supabase anon key and API URL are safe here because they are public-facing. Private keys (Spotify, Cloudinary, Resend) live only on the SvelteKit backend — the mobile app never calls those services directly.

### 4. Start the dev server

```bash
npx expo start
```

Then press **i** to open the iOS Simulator.

---

## Project Structure

```
loam-mobile/
├── app/                    # Screens (Expo Router — file = route)
│   ├── index.js            # Entry point / auth redirect
│   ├── onboarding/         # Onboarding flow (pre-auth)
│   │   ├── welcome.js      # 4 welcome slides
│   │   ├── signup.js       # DOB, name, email, password
│   │   ├── profile-setup.js# Username, display name, bio, photo
│   │   ├── education.js    # "Let's complete your profile" slide
│   │   ├── post-song.js    # Step 1 of 3 — add a song
│   │   ├── post-book.js    # Step 2 of 3 — add a book
│   │   ├── post-movie.js   # Step 3 of 3 — add a movie
│   │   └── add-buds.js     # Search and add initial connections
│   ├── (app)/              # Main app (requires auth)
│   │   ├── _layout.js      # Bottom tab navigator
│   │   ├── feed.js         # Home feed
│   │   ├── create-post.js  # Post creation (all types)
│   │   ├── profile.js      # Own profile
│   │   ├── notifications.js# Notifications + bud requests
│   │   └── [username].js   # Any user's profile (dynamic route)
│   └── _layout.js          # Root layout (auth provider)
├── lib/
│   ├── api/                # Functions that call loam.ing/api/*
│   │   ├── auth.js         # signup, login, logout
│   │   ├── posts.js        # createPost, getFeed
│   │   ├── connections.js  # getConnections, requestBud, acceptBud
│   │   └── notifications.js# getNotifications
│   ├── components/         # Reusable UI components
│   │   ├── PostCard.js     # Feed post card
│   │   ├── Button.js       # Standard button
│   │   └── ProfileImage.js # Avatar with fallback
│   └── stores/
│       └── auth.js         # Auth context (session, user, loading)
├── docs/
│   └── MOBILE_DEV_GUIDE.md # This file
├── .env                    # Local env vars (never commit)
├── .env.example            # Committed template
└── app.json                # Expo app config
```

---

## How the Backend Connection Works

The mobile app talks to the existing SvelteKit backend at `https://loam.ing`.  
Every API call includes the Supabase auth token in the header:

```javascript
const response = await fetch(`${API_URL}/api/feed`, {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  },
});
```

The SvelteKit backend reads this token to identify the user server-side.  
**You never call Supabase tables directly from the mobile app** (except for auth sign-in/sign-up). All data goes through the existing API routes.

---

## Navigation Structure

Expo Router works exactly like SvelteKit's file-based routing.

| File                        | Route                 | Notes                                                       |
| --------------------------- | --------------------- | ----------------------------------------------------------- |
| `app/index.js`              | `/`                   | Redirects to `/feed` or `/onboarding/welcome` based on auth |
| `app/onboarding/welcome.js` | `/onboarding/welcome` | First screen new users see                                  |
| `app/(app)/feed.js`         | `/feed`               | Protected — redirects to login if no session                |
| `app/(app)/[username].js`   | `/<any username>`     | Dynamic profile route                                       |

The `(app)` folder uses parentheses just like SvelteKit — it's a layout group, not a URL segment.

---

## Auth Flow

1. App launches → checks for existing Supabase session in AsyncStorage
2. **No session** → redirect to `/onboarding/welcome`
3. **Session exists** → redirect to `/feed`
4. On signup → Supabase creates user → SvelteKit backend handles profile creation
5. Session token is stored in AsyncStorage (React Native's equivalent of localStorage)
6. Every API call sends `Authorization: Bearer <token>` header

---

## Key Differences from the Web App

| Web (SvelteKit)          | Mobile (Expo)                               |
| ------------------------ | ------------------------------------------- |
| `+page.svelte` files     | `app/*.js` files                            |
| `+server.js` API routes  | Not present — these stay on the web backend |
| CSS / SCSS               | `StyleSheet.create({})`                     |
| `<div>`, `<p>`, `<img>`  | `<View>`, `<Text>`, `<Image>`               |
| Browser cookies for auth | AsyncStorage + Authorization header         |
| `goto('/feed')`          | `router.replace('/feed')`                   |
| Svelte stores            | React Context / useState                    |
| `on:click`               | `onPress`                                   |

---

## Adding New Dependencies

Always use Expo's installer — it pins the correct compatible version:

```bash
npx expo install <package-name>
```

Never use plain `npm install` for React Native packages. If you get peer dependency errors, add `--legacy-peer-deps`:

```bash
npx expo install <package-name> -- --legacy-peer-deps
```

---

## Git Workflow

Same as the web app — feature branches + PRs. A few mobile-specific rules:

1. **Never commit `.env`** — it contains your Supabase keys
2. **Don't run `expo prebuild`** unless the whole team knows — it generates an `ios/` folder that causes merge conflicts
3. **After pulling changes that add new packages**, always run `npm install --legacy-peer-deps` before starting the dev server
4. **One person manages dependency upgrades** at a time

---

## Running on a Physical iPhone

SDK 56 requires the latest Expo Go. If your Expo Go shows a version mismatch:

- Update Expo Go via the App Store
- If still mismatched, use the iOS Simulator (press `i` in the terminal) — this is the recommended dev environment

---

## Deployment (App Store)

We use EAS (Expo Application Services) for builds and submissions. This is set up separately — do not run `eas build` without coordinating with the team first as it uses build minutes on the shared account.

---

## Questions?

Start by checking the existing SvelteKit codebase at `/loam` — the API routes, data shapes, and business logic are all documented there through the code itself. The mobile app is a new UI on top of the same backend.
