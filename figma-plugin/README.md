# Wayfare Builder (local Figma plugin)

Builds the Wayfare design system straight in the Figma desktop app. It uses the
normal Figma Plugin API, so it doesn't count against the Figma MCP tool-call limit.

## One-time setup

1. Open the **Figma desktop app** (development plugins don't run in the browser).
2. Open the **Web designs** file and go to the page with the Wayfare screens.
3. Menu → **Plugins → Development → Import plugin from manifest…**
4. Pick `figma-plugin/manifest.json` from this folder.

## Running a step

Menu → **Plugins → Development → Wayfare Builder → A3 · Build components**

- When it's done, a message at the bottom of the canvas says
  `✓ A3 done: 13 components + 31 icons…` and the new **Components** section is selected.
- If anything goes wrong, the message starts with `⚠ Wayfare Builder:` and the run
  removes whatever it created. Copy that message to Claude.
  More detail: **Plugins → Development → Show/Hide console**.

## Steps

| Command | What it does | Needs |
|---|---|---|
| A3 · Build components | "Components" section at x 2800: 31 icons + Chip, Button, IconButton, RatingBadge, StatusBadge, ListRow, InclusionRow, NavBar, EmptyState, DayCard, ExperienceCard, DestinationHeroCard, StickyBookingBar | A2 tokens (`Wayfare/…` variables + text styles) |

| A4 · Rebuild screens | Copies the 9 originals into a "Wayfare / _archive" section, then rebuilds 8 screens inside their original frames (same names + IDs) from the components. Loading Screen keeps its layout; its colors get bound to variables. | A3 "Components" section |

| A5 · Add new screens | 19 new frames in a "Wayfare / A5 screens" section (onboarding ×3, sign in, OTP, search, filters, booking dates/review/payment/confirmed, trip details, ticket, saved, edit profile, notifications + empty, offline, home skeleton). Adds 4 icons (Wifi Off, Sun, Lock, Camera) to the icon grid. | A4 (takes its images from the rebuilt screens) |

| A6 · Prototype + QA report | Wires the clickable prototype (flow start: Loading Screen; onboarding → sign in → OTP → home → destination → experience → booking → confirmation → trips → trip details → ticket; all NavBar tabs and back buttons). Then QA: text < 12px (own text raised to 12), contrast < 4.5:1, wired targets < 44px, hard-coded colors (exact matches bound to variables), detached instances, frames without auto layout, data consistency. Writes a "Wayfare / QA report" frame. Safe to re-run. | A5 |

A3 refuses to run if a "Components" section already exists. Delete or rename it first to rebuild.

A4 builds every screen off-canvas first, so if a build fails nothing on the page changes. It refuses to run
twice (when "Wayfare / _archive" exists). To redo it: Ctrl+Z, or copy the archived frames back. Notes
(missing images, unmatched colors) go to **Plugins → Development → Show/Hide console**.

## Notes

- Icons are local iconsax-style Linear drawings (24px, 1.5 stroke), not the official
  Iconsax set. Components use them through an **Icon** swap property, so they're easy
  to swap once an Iconsax library is enabled.
- Tokens and text styles are looked up **by name** (`Wayfare/Colors`, `Wayfare/Body/14 Medium`, …),
  so renaming them breaks the plugin.
