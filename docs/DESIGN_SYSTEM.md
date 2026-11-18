# Sparks — Design System

> Light by default, Dark opt-in (v1.7.0). Apple-inspired, minimal. If a design choice is
> not in this document, it is not approved — do not invent new colours,
> fonts, radii, or components.

## 1. Tokens (`styles/globals.css`, `tailwind.config.js`)

| Token | Light | Dark (v1.7.0, `html[data-theme="dark"]`) |
|---|---|---|
| Blue (accent) | `#007AFF` | `#0A84FF` |
| Blue light (tint) | `#E8F1FF` | `rgba(10,132,255,0.18)` |
| Green (success / online / accept) | `#34C759` | `#30D158` |
| Red (danger / decline / end call) | `#FF3B30` | `#FF453A` |
| Orange (warning) | `#FF9500` | `#FF9F0A` |
| Ink (text) | `#1D1D1F` | `#F5F5F7` |
| Grey 1 (secondary text) | `#6E6E73` | `#98989D` |
| Grey 2 (fills) | `#F5F5F7` | `#1C1C1E` |
| Grey 3 (borders) | `#E5E5EA` | `#2C2C2E` |
| White | `#FFFFFF` | `#FFFFFF` (never changes — text on blue, switch knobs) |
| Background (page) | `#FFFFFF` | `#000000` |
| Surface (solid cards) | `#FFFFFF` | `#1C1C1E` |

- **Dark mode (v1.7.0, opt-in).** Settings → Appearance offers Light /
  Dark / System. The choice lives in localStorage (`sparks-theme`) and
  is painted by a blocking script in the root layout before first
  paint — no white flash. Dark is a `html[data-theme="dark"]` override
  of the tokens above plus dark glass fills in `styles/globals.css`;
  there are no per-component `dark:` classes anywhere. Light stays the
  default — nothing changes until the user flips the switch.
- **No gradients.** Flat colour only.
- **No new colours.** Everything uses the tokens above.
- **Font:** system stack — `-apple-system, BlinkMacSystemFont,
  "SF Pro Display", "SF Pro Text", Inter, sans-serif`.
- **Radii:** sm 16px, md 24px, lg 28px, xl 32px, full 9999px.
- **Shadows:** sm `0 1px 3px rgba(0,0,0,0.06)`, md
  `0 4px 16px rgba(0,0,0,0.08)`. Nothing heavier except the phone
  frame on the landing page and the call end button glow.

## 2. Type hierarchy

- Page title: 24px bold (`text-2xl font-bold`).
- Section heading: 20px bold (`text-xl font-bold`).
- Name / primary row text: 15px semibold.
- Body / message text: 14–15px regular.
- Secondary text (time, preview, hints): 12–13px, grey-1.
- Section labels (settings): 12px semibold, uppercase, tracking-wide,
  grey-1.

## 3. Spacing

- Base unit 8px. Standard gaps: 8 / 16 / 24px.
- Screen side padding: 20px (`px-5`).
- Rows: 12–16px vertical padding.
- Cards: 16px padding, 16–28px radius, white on grey-2 background
  (settings) or grey-2 fill on white (chat list search).

## 4. Touch targets and motion

- Minimum touch target: **44 × 44 pt** — every icon-only button is
  44px (`w-11 h-11`), every list row is at least 68px tall.
- Transitions: **200 ms**, ease-out. Press feedback is a subtle
  `active:scale-95` (or opacity) — never a bounce, never a flash.
- Loading: **skeletons**, not bare spinners as the main pattern.
  Every list and thread has a skeleton state and an empty state.
- **Reduced motion:** all CSS animations are disabled under
  `prefers-reduced-motion: reduce` (see `globals.css`); the landing
  page uses `MotionConfig reducedMotion="user"`. The call ringing
  pulse and typing dots stop — content stays still.

## 5. Components

- **Avatar:** circle, initials on a stable colour from the name, or
  the user's photo. Online = green dot. Unread = blue badge.
- **Message bubbles:** own = blue, white text, bottom-right corner
  tight (4px); theirs = grey-2, ink text, bottom-left corner tight.
  Padding and radius follow the user's bubble-size setting
  (compact / standard / large via `--bubble-pad-*` variables).
- **Composer:** rounded input on grey-2, 44px send button (blue),
  44px attach / emoji / mic buttons. Recording state is a red-dot
  bar with a live waveform.
- **BottomNav (mobile):** frosted white (`rgba(255,255,255,0.95)`),
  hairline top border, safe-area bottom padding, 6 tabs (Chats,
  Calls, Search, new-chat FAB, Activity, Profile).
- **DesktopNavRail (desktop):** 72px icon rail, active tab in
  blue tint.
- **CallScreen:** full-screen, black when video is live, frosted-glass
  control bar (`blur(24px) saturate(1.4)`), pulsing ring around the
  avatar while ringing, 72px red end button, 56px controls.
- **Empty states:** a glass tile holding the calligraphic wordmark
  (Chats / Calls / Activity) or a plain dot, a bold title, one line
  of grey-1 explanation, and one action button when there is
  something to do.

## 6. The Spark identity (unique, not a clone)

Sparks is not a WhatsApp/Telegram clone. Its identity is:

1. **The Spark Request handshake** — the moment of accepting a Spark
   is the product's signature. It is clear, deliberate, and visible
   (Accept / Decline), not hidden.
2. **The calligraphic wordmark** — the brand is ONLY the word "Sparks"
   in calligraphy (Great Vibes, `components/brand/SparkWordmark.tsx`),
   finished with a plain blue dot. There is no icon next to it and no
   lightning bolt anywhere in the app — no lightning character, no Zap/Bolt
   icon. The wordmark writes itself in on entry, then loops forever
   with a soft light shimmer and a slow glow (static under
   prefers-reduced-motion). It appears on the landing hero, the
   splash, every auth screen, and the Chats / Calls / Activity empty
   states.
3. **Liquid glass** — layered translucent white over blurred content
   (`.glass` / `.glass-strong` / `.glass-card` / `.glass-dark` /
   `.glass-input` in `styles/globals.css`), bright hairline edges,
   soft shadows, spring motion. Translucency and blur are the glass;
   there are no colour gradients anywhere.
4. **Restraint** — one accent colour, one font stack, flat colour,
   generous spacing. The uniqueness comes from the experience
   (consent-first messaging), not from loud colours or gimmicks.

## 7. Rules for new screens

1. Light is the default; Dark is opt-in. Check every new screen in a light AND a dark viewport.
2. Use the tokens — no hex values invented on the spot.
3. 44pt minimum touch targets on every interactive element.
4. Every list needs a skeleton + an empty state + an error state.
5. Every icon-only button needs an `aria-label`.
6. Every input needs a label or a placeholder that says what it is.
7. No "coming soon", no disabled-looking button that is actually
   alive, no invented people or messages in any preview.
