# QuietBooth design system

QuietBooth looks like a private room seen from the doorway: dark olive walls, stone-colored paper, and brass hardware. The pieces carry the color. Everything else stays out of the way.

## Why the site is quiet

Most 47th Street dealer sites lead with sale banners, chat bubbles, and dense product grids. Those signal a counter, not a salon. A buyer spending five or six figures wants evidence of care: unhurried pages, real provenance, a person's name, and one clear next step. QuietBooth makes every page end at the same step, which is a private appointment.

The rules that follow from that:

- One primary action per screen, in brass. Secondary actions are outlined or underlined text.
- No popups, modals, marquees, countdowns, chat widgets, or autoplay.
- No visible prices. Every piece invites a written price request.
- Each piece gets a story, provenance, condition, and specs, in that order.

## Color tokens

`site.config.json` defines the colors and the build writes them to `assets/css/tokens.css`.

| Token | Hex | Use |
| --- | --- | --- |
| `--ink` | `#0D0F0B` | Page background. |
| `--olive` | `#1B1F17` | Raised sections, image tone. |
| `--olive-soft` | `#262B21` | Cards, inputs, hover fills. |
| `--line` | `#3A4033` | Hairlines and borders on dark. |
| `--stone` | `#E6DFD2` | Body text on dark. Light section background. |
| `--stone-muted` | `#ABA391` | Secondary text on dark. |
| `--stone-deep` | `#CFC6B5` | Italic accents in headlines. |
| `--brass` | `#BE9A5F` | Primary buttons, eyebrows, focus rings. |
| `--brass-bright` | `#D8B77C` | Hover state for brass. |
| `--brass-deep` | `#7A5B2C` | Brass text on stone sections. |

`site.css` adds `--ink-on-stone` (`#5A5345`) for secondary text on stone and `--error` (`#F0A595`) for form errors on dark.

Contrast on `--ink`: stone is 14.5 to 1, stone-muted is 7.7 to 1, and brass is 7.3 to 1. On stone, brass-deep is 4.7 to 1 and ink-on-stone is 5.7 to 1. Every text pair passes WCAG AA. Lighthouse reports 100 for accessibility on every audited page.

## Type

| Role | Family | Weight | Notes |
| --- | --- | --- | --- |
| Display | Cormorant | 300 | Italic for the second half of a headline. |
| Body and UI | Hanken Grotesk | 400 and 500 | Uppercase with wide tracking for eyebrows and buttons. |

Both fonts are self-hosted woff2 files under the SIL Open Font License 1.1. The two upright files are preloaded.

| Class | Size | Line height |
| --- | --- | --- |
| `.display-xl` | `clamp(2.75rem, 6.6vw, 6.75rem)` | 0.98 |
| `.display-l` | `clamp(2rem, 4vw, 3.6rem)` | 1.1 |
| `.display-m` | `clamp(1.75rem, 2.9vw, 2.65rem)` | 1.12 |
| `.display-s` | `clamp(1.35rem, 1.8vw, 1.6rem)` | 1.3 |
| `.eyebrow` | `0.75rem`, tracking `0.22em` | 1.5 |

Cormorant uses old-style figures by default, so a "1" can read as a dotless "i". Dates, times, references, prices, and spec values set `font-variant-numeric: lining-nums tabular-nums`.

## Space and layout

| Token | Value | Use |
| --- | --- | --- |
| `--pad` | `clamp(1.25rem, 5vw, 4.5rem)` | Page gutters. |
| `--section` | `clamp(5rem, 11vw, 10.5rem)` | Vertical rhythm between sections. |
| `--header` | `5.25rem` | Header height. |

Content sits in a 92rem column. The home feature grid uses 12 columns. The home page places featured pieces on an uneven grid so no two neighbors share a size. Breakpoints sit at 1180, 900, and 600 pixels. At 900 and below the hero and lookbook chapter images stack above their text, so text never sits on top of a dial.

## Motion

- Easing is `--ease`, `cubic-bezier(.2, .65, .15, 1)`.
- Sections fade up 28 pixels once as they enter the viewport.
- Hero and chapter images move a few pixels on scroll.
- On devices with a mouse, a small "View" label follows the pointer over pieces.

With `prefers-reduced-motion: reduce`, all of these are off and content appears in place.

## Components

- **Header.** Transparent over the hero, solid after scrolling. It hides on scroll down and returns on scroll up. The full menu is a page overlay with a focus trap. Escape closes it and returns focus to the button.
- **Buttons.** `.btn-solid` in brass for the one main action. `.btn-line` outlined. `.btn-text` underlined.
- **Piece card.** Image, maker and year eyebrow, title, headline in italic, reference, and a status tag.
- **Piece page.** Gallery with four views and thumbnails, a summary list, the two contact actions, an inline discreet question form, the story, provenance, condition, specs, the dossier list, and related pieces.
- **Appointment.** Four numbered steps: date, time, visit details, and contact. A live summary card follows the guest's choices. The calendar is a grid with arrow-key navigation. Closed days are dimmed and cannot be chosen. The confirmation offers an `.ics` calendar file.
- **Forms.** Labels sit above fields. On submit with errors, a summary box takes focus and links to each field, and each field shows its own message and sets `aria-invalid`.
- **Footer.** Private client list signup, concierge contacts, visit details and hours, links, and the demo notice.

## Accessibility

- A skip link is the first focusable element on every page.
- Focus is visible on every control as a 2-pixel brass outline, darker brass on stone sections.
- Landmarks, one `h1` per page, and ordered headings throughout.
- Every image has alt text that describes the piece. Decorative SVG is hidden from assistive technology.
- Status changes in forms are announced through live regions.
- The site works without JavaScript for reading. The forms and calendar need it.
