# Loam Mobile — Claude Project Context

Paste this file into Claude at the start of a new chat to get oriented on the project quickly.

---

## What is Loam?

Loam is an intentional social network — no algorithm, no doomscrolling, just chronological posts from people you actually know. Feed resets every 72 hours. Connections are limited to 150. Profile shows your 10 most recent profile items.

The mobile app is a **React Native / Expo** iOS app that connects to an existing **SvelteKit backend** deployed at `https://loam.ing`. The mobile app is a new frontend — the backend is already built and does not need to change (with minor exceptions noted below).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native, Expo Managed Workflow, SDK 56 |
| Navigation | Expo Router (file-based, like SvelteKit routes) |
| Auth | Supabase JS client (`@supabase/supabase-js`) |
| API calls | `fetch()` to `https://loam.ing/api/*` with Bearer token |
| Styling | React Native `StyleSheet` + shared `lib/theme.js` |
| Image upload | `expo-image-picker` + `expo-file-system/legacy` → base64 JSON to backend |
| SVG rendering | `react-native-svg` + `react-native-svg-transformer` |
| Fonts | `expo-font` — Bricolage Grotesque + Host Grotesk loaded in `_layout.js` |

---

## Repository

- **Repo:** `https://github.com/MaxWix/loam-mobile` (private)
- **Branch convention:** feature branches + PRs, same as web app
- **Always use** `npx expo install` not `npm install` for new packages
- **If peer dep errors:** add `-- --legacy-peer-deps`
- **Never commit** `.env`

---

## Running Locally

```bash
git clone https://github.com/MaxWix/loam-mobile.git
cd loam-mobile
npm install --legacy-peer-deps
cp .env.example .env
# Fill in .env values — get from team
npx expo start --clear
# Press i to open iOS Simulator
```

Full setup instructions (Xcode, Node, Watchman, etc.) are in `docs/MOBILE_DEV_GUIDE.md`.

---

## Environment Variables

```
EXPO_PUBLIC_API_URL=https://loam.ing
EXPO_PUBLIC_API_URL_LOCAL=http://<your-local-ip>:5173
EXPO_PUBLIC_SUPABASE_URL=<supabase project url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>
```

`API_URL` is exported from `lib/config.js` — it automatically uses the local URL in dev and production URL in prod. Use `API_URL` everywhere, never hardcode `https://loam.ing`.

---

## Project Structure

```
loam-mobile/
├── app/
│   ├── index.js                    # Redirects to /onboarding/auth
│   ├── _layout.js                  # Root layout — loads fonts, handles auth routing
│   ├── onboarding/
│   │   ├── auth.js                 # ✅ Welcome screen — login/signup choice
│   │   ├── welcome.js              # ✅ 4 onboarding slides (signup path only)
│   │   ├── signup.js               # ✅ Signup form
│   │   ├── login.js                # ✅ Login form
│   │   ├── profile-setup.js        # ✅ Username, display name, bio, photo
│   │   ├── education.js            # ✅ "Let's complete your profile" slide
│   │   ├── post-song.js            # ⬜ Step 1 of 3 — add a song (not built)
│   │   ├── post-book.js            # ⬜ Step 2 of 3 — add a book (not built)
│   │   ├── post-movie.js           # ⬜ Step 3 of 3 — add a movie (not built)
│   │   └── add-buds.js             # ⬜ Search and add initial buds (not built)
│   └── (app)/
│       ├── _layout.js              # Tab navigator (Home / Post / Profile)
│       ├── feed.js                 # ⬜ Placeholder only
│       ├── create-post.js          # ⬜ Placeholder only
│       ├── profile.js              # ✅ Own profile — masonry grid, tabs, logout
│       ├── notifications.js        # ⬜ Not built
│       └── profile/
│           └── edit.js             # ✅ Edit profile — name, username, bio, photo
├── lib/
│   ├── theme.js                    # ✅ All design tokens — colors, typography, buttons, inputs
│   ├── config.js                   # ✅ API_URL helper (dev vs prod)
│   ├── stores/
│   │   └── auth.js                 # ✅ Supabase client + AuthProvider + useAuth hook
│   ├── components/
│   │   ├── Button.js               # ✅ All variants: lime, ghost, gray, brown, clay, icon
│   │   ├── ProfileImage.js         # ✅ Organic blob SVG shape with image or placeholder
│   │   ├── ProfileDetails.js       # ✅ Profile header — image, name, username, bio, actions
│   │   ├── ProfileItem.js          # ✅ Profile grid card with organic SVG background
│   │   └── Tabs.js                 # ✅ Sliding indicator tabs (used within screens)
│   └── assets/
│       ├── icons/                  # SVG icons (edit, share, nav icons, etc.)
│       └── fonts/                  # Bricolage Grotesque + Host Grotesk TTF files
└── docs/
    └── MOBILE_DEV_GUIDE.md         # Full developer setup and reference guide
```

---

## Design System

Everything lives in `lib/theme.js`. **Always import from theme, never hardcode values.**

```javascript
import { colors, typography, buttons, inputs, layout, spacing, radius, fonts } from '../lib/theme';
```

Key tokens:
- Background: `colors.brown50` (`#F3EEE4`)
- Primary text: `colors.brown900` (`#100900`)
- Primary action: `colors.brown500` (`#462B01`)
- Accent: `colors.lime500` (`#AFB066`)
- Input background: `colors.white400` (`#FAF5EA`)

**Font weights in React Native must use font family variants, not `fontWeight`:**
```javascript
// WRONG
{ fontFamily: fonts.display, fontWeight: '800' }

// CORRECT
{ fontFamily: fonts.displayExtraBold }
```

Font family variants: `fonts.display`, `fonts.displayMedium`, `fonts.displayBold`, `fonts.displayExtraBold`, `fonts.primary`, `fonts.primaryMedium`, `fonts.primaryBold`

---

## Auth Architecture

- **Login/signup:** Supabase direct (`supabase.auth.signInWithPassword`, `supabase.auth.signUp`)
- **Session storage:** AsyncStorage (React Native equivalent of localStorage)
- **API calls:** Every fetch to `loam.ing/api/*` includes `Authorization: Bearer <token>`
- **Backend auth:** `hooks.server.js` on the SvelteKit side checks for Bearer token first, falls back to cookies for web

The root `_layout.js` handles initial routing:
- No session → `/onboarding/auth`
- Session but no username → `/onboarding/profile-setup`
- Session, username, but `onboarding_complete: false` → `/onboarding/education`
- Session, username, `onboarding_complete: true` → `/(app)/feed`

`hasNavigated` ref ensures this only fires once on app launch, not on every screen navigation.

---

## When to call the backend vs Supabase directly

| Use backend (`API_URL/api/*`) | Use Supabase directly |
|---|---|
| Feed (72hr filter logic) | Auth (signIn, signUp, signOut) |
| Creating posts (Spotify/TMDB/Books APIs) | Reading profile data |
| Image uploads (Cloudinary) | Reading/writing reactions |
| Media search (Spotify/TMDB/Books) | Reading/writing comments |
| Sending emails (Resend) | Reading profile items |
| Anything involving secret keys | Accepting/denying bud requests |

---

## Supabase Schema (key tables)

```
profiles        id, email, first_name, last_name, display_name, username, bio, profile_img, onboarding_complete
posts           id, user_id, title, caption, media_url, category, color, is_profile_item, archived, subtitle, branch_id
connections     id, requester_id, receiver_id, status (requested/approved)
reactions       id, user_id, post_id, emoji
comments        id, user_id, post_id, content, parent_comment_id (for threading)
branches        id, user_id, name, color, emoji
```

---

## Navigation Notes

- The bottom tab bar uses **Expo Router's built-in `Tabs`** — this is a native navigator, not the custom `Tabs` component
- The custom `Tabs` component (`lib/components/Tabs.js`) is for **content tabs within a screen** (e.g. Profile / Archive on the profile page)
- To hide a screen from the tab bar but keep it accessible: add `options={{ href: null }}` in `(app)/_layout.js`
- Always use `router.replace()` not `router.back()` when navigating after a save — `router.back()` can trigger the root layout auth check

---

## Outstanding Jira Tickets

**LOAM-MOB-1: Feed Screen & Post Card Component**
Build the main feed screen. Feed queries `/api/feed` (existing SvelteKit route). Post card has organic SVG background, profile image, username link, media image + type icon, title/subtitle/caption, reaction + comment buttons, post age, three-dot menu for own posts (archive/delete).

**LOAM-MOB-2: Reactions**
Emoji picker on post cards. Writes to `reactions` table directly via Supabase. Toggle on/off. Displays under post.

**LOAM-MOB-3: Comments**
Bottom sheet modal (`@gorhom/bottom-sheet`). Threaded replies via `parent_comment_id`. Anonymous display for non-connected commenters. Fixed input row at bottom.

**LOAM-MOB-4: ProfileImage Component** ✅ Built — `lib/components/ProfileImage.js`

**LOAM-MOB-5: Branch Organization**
Horizontal scrollable branch row on feed. Filter feed by branch. Create branch screen.

**LOAM-MOB-6: UsernameLink Component**
Tappable username → navigates to `/(app)/profile/[username]`. Used on post cards, comments, notifications.

---

## Known Issues / Notes

- `expo-file-system/legacy` must be used (not `expo-file-system`) — `readAsStringAsync` moved to legacy API in SDK 56
- SVG files imported as React components via `react-native-svg-transformer` — configured in `metro.config.js`
- Image uploads send base64 JSON to backend (not FormData) — Expo Go doesn't support FormData file uploads
- The SvelteKit backend's `hooks.server.js` was updated to support Bearer token auth alongside existing cookie auth
- The Supabase `handle_new_user` trigger uses `COALESCE` to prevent null failures on `first_name`/`last_name`
- `onboarding_complete` column was added to `profiles` table — existing users were backfilled with `UPDATE profiles SET onboarding_complete = true WHERE username IS NOT NULL`
