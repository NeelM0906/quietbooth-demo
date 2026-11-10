# QuietBooth

QuietBooth is a static website template for an appointment-only watch and jewelry salon. It ships as plain HTML, CSS, and JavaScript. Open `index.html` through any static server and the site works. There is no framework and nothing to install to view or deploy it.

The brand, people, and addresses in this demo are fictional. The pieces are real, identifiable watches and jewels, and every image is a real photograph used under a free licence (see `CREDITS.md` and `/credits/`).

## What is in the box

| Path | What it is |
| --- | --- |
| `site.config.json` | The brand: name, tagline, colors, contact, WhatsApp, address, hours, hosts, and form endpoints. |
| `content/pieces.json` | Lookbook chapters and every piece. |
| `content/journal.json` | Journal articles. |
| `content/faq.json` | FAQ groups. |
| `build/build.mjs` | Reads the config and content and writes every page. Node 18 or later, no dependencies. |
| `content/photos.json` | Photo manifest: size, responsive widths, author, licence, and source for every image in `assets/photo/`. |
| `assets/css/site.css` | The stylesheet. |
| `assets/css/tokens.css` | Color tokens. Generated from the config. |
| `assets/js/site.js` | Forms, appointment calendar, menu, gallery, filter, and motion. |
| `assets/js/config.js` | The config values the browser needs. Generated. |
| `assets/fonts/` | Self-hosted Cormorant and Hanken Grotesk, SIL OFL 1.1. |
| `tools/` | Optional verification, Lighthouse, and social image tools. Not deployed. |

Pages: home, lookbook, 15 piece pages, private appointment, the house, authenticity, sell or consign, journal with 4 articles, visit, questions, legal, and a 404.

## Rebrand the site

1. Edit `site.config.json`. Change `brand`, `colors`, `contact`, `address`, `hours`, `hosts`, and `siteUrl`.
2. Rebuild the pages.

	```sh
	node build/build.mjs
	```

	The build prints `built 31 pages and 30 photographs`.

3. Preview the result.

	```sh
	python3 -m http.server 8765
	```

	Open `http://127.0.0.1:8765/`.

4. If you changed the name, tagline, or colors, regenerate the social image and the touch icon.

	```sh
	cd tools && npm install && npx playwright install chromium && node render-assets.mjs
	```

Hours drive the appointment calendar. A day with no entry in `hours` shows as closed. `appointment.leadDays` sets the earliest bookable day, `appointment.horizonDays` sets the latest, and `appointment.maxParty` caps the party size.

Do not edit `tokens.css`, `config.js`, `sitemap.xml`, `robots.txt`, `site.webmanifest`, `favicon.svg`, or any `index.html`. The build overwrites them.

## Replace the demo pieces with real stock

Each piece in `content/pieces.json` has this shape.

```json
{
	"slug": "verrault-lumen-38",
	"chapter": "steel",
	"kind": "watch",
	"featured": true,
	"status": "available",
	"maker": "Maison Verrault",
	"title": "Lumen 38",
	"reference": "Ref. 3812",
	"year": "2019",
	"headline": "One line shown under the title.",
	"story": ["First paragraph.", "Second paragraph."],
	"provenance": ["Single owner since new"],
	"condition": "Excellent. Case unpolished.",
	"specs": [["Case", "Stainless steel, 38 mm"]],
	"photos": [{ "id": "lumen-38-front", "alt": "The Lumen 38 with a slate dial, front view" }]
}
```

- `chapter` must match an `id` in `chapters`.
- `kind` is `watch` or `jewelry`. The lookbook filter uses it.
- `status` is `available`, `on-hold`, `reserved`, or `reference` (a museum or exhibition piece shown for reference; its button becomes "Ask us to find one like it"). A reserved piece swaps its button for "Ask to be told if it returns".
- `featured: true` puts the piece on the home page. Six works best.

Photographs: each piece has a `photos` list of `{ "id", "alt", "pos" }`. The `id` points to an entry in `content/photos.json` and files named `assets/photo/<id>-<width>.webp` (480, 960, and 1600 wide). `pos` is an optional CSS `object-position` for the crop. Write real descriptive alt text. Add your own photos by resizing them to those widths and adding a manifest entry with author, licence, and source; the credits page builds itself from the manifest. Shoot every piece on the same surface in daylight for production.

Prices are never shown. The site asks guests to request a price in writing. To show prices, add a `price` field and render it in `piecePage` in `build/build.mjs`.

## Wire the forms to your inbox or CRM

Every form goes through one function, `send(kind, record)` in `assets/js/site.js`. The `kind` is `appointment`, `inquiry`, `consign`, or `list`.

- With no endpoint set, the record is saved to `localStorage` under `qb.<kind>` and the guest sees the confirmation. Use this mode for demos only.
- To receive appointment requests, set `appointment.endpoint` in `site.config.json`.
- To receive the other three forms, set `appointment.formEndpoint`.

The site sends a `POST` with a JSON body. The body holds `kind`, `ref` (for example `QB-7K2LQ`), `createdAt`, and every named field in the form. A response outside the 200 range shows an error to the guest and keeps their entries.


Rebuild after you change an endpoint.

## Deploy

The site is the folder itself. Upload everything except `tools/`, `build/`, `content/`, and `screenshots/`. Leaving those in place is harmless.

**Netlify.** Drag the folder onto the Netlify dashboard, or connect the repository with no build command and `.` as the publish directory. Netlify serves `404.html` for unknown paths.

**Vercel.** Import the repository with the framework preset **Other**, no build command, and `.` as the output directory.

**GitHub Pages.** Push the folder to a repository and enable Pages on the branch root. If the site lives under a sub-path such as `user.github.io/quietbooth/`, the pages work because every internal link is relative. The `404.html` page uses root paths, so on a sub-path it shows without styles. Use a custom domain to avoid that.

Before launch, set `siteUrl` to the real domain and rebuild. The canonical links, Open Graph tags, sitemap, and JSON-LD all read it.

## Check your changes

The `tools/` folder holds the scripts that produced the evidence for this build.

```sh
cd tools
npm install
npx playwright install chromium
python3 -m http.server 8765 --directory .. &
node verify.mjs
node lighthouse.mjs
```

`verify.mjs` screenshots every page at 375, 768, 1280, and 1920 pixels wide into `screenshots/`. It checks for horizontal overflow, broken links and anchors, console errors, and failed requests. It also runs the appointment, consign, inquiry, and list forms end to end. It writes `screenshots/verify-report.json`.

`lighthouse.mjs` scores the home, lookbook, piece, and appointment pages on mobile and desktop and writes `screenshots/lighthouse/summary.json`. Set `CHROME_PATH` if Chrome is not on the default path.

## Accessibility and restraint

The template has no popups, modals, marquees, countdowns, chat widgets, or autoplaying media. Do not add them. The design depends on the room feeling quiet.

Text meets WCAG AA contrast. Every control works by keyboard. Motion stops when the visitor asks the system for reduced motion. See `DESIGN.md` for the tokens and the rules behind them.
