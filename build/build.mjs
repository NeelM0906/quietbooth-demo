import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const C = read('site.config.json');
const { chapters, pieces } = read('content/pieces.json');
const { articles } = read('content/journal.json');
const { groups: faqGroups } = read('content/faq.json');
const PHOTOS = read('content/photos.json');
const B = C.brand;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bySlug = Object.fromEntries(pieces.map((p) => [p.slug, p]));
const chapterOf = Object.fromEntries(chapters.map((c) => [c.id, c]));
const wa = (text) => `https://wa.me/${C.contact.whatsapp}?text=${encodeURIComponent(text)}`;
const tel = `tel:${C.contact.phone.replace(/[^+\d]/g, '')}`;
const mailto = (subject) => `mailto:${C.contact.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const STATUS = { available: 'Available to view', 'on-hold': 'On hold for a client', reserved: 'Reserved', reference: 'Reference piece' };
const VIEW_LABEL = { front: 'front view', detail: 'detail', study: 'study on stone' };
const fullAddress = `${C.address.street}, ${C.address.suite}, ${C.address.city}, ${C.address.region} ${C.address.postal}`;
const readMins = (a) => Math.max(2, Math.round(a.body.map((b) => Object.values(b)[0]).join(' ').split(/\s+/).length / 220));

const NAV = [
  { href: 'lookbook/', label: 'Lookbook' },
  { href: 'house/', label: 'The House' },
  { href: 'authenticity/', label: 'Authenticity' },
  { href: 'journal/', label: 'Journal' },
  { href: 'visit/', label: 'Visit' }
];
const MORE = [
  { href: 'consign/', label: 'Sell or consign' },
  { href: 'faq/', label: 'Questions' },
  { href: 'legal/', label: 'Legal and privacy' }
];

function rel(from, to) {
  const depth = from.split('/').filter(Boolean).length;
  return ('../'.repeat(depth) || './') + to;
}

const VIEW_INDEX = { front: 0, detail: 1, study: 2, wide: 0, hero: 0 };
const photoFor = (slug, view) => {
  const p = bySlug[slug];
  if (!p) return { id: slug };
  const list = p.photos;
  return list[(VIEW_INDEX[view] ?? 0) % list.length];
};
const SIZES = { card: '(max-width: 760px) 92vw, 30vw', full: '100vw', half: '(max-width: 900px) 92vw, 55vw', thumb: '6rem' };
const photoImg = (u, ph, alt, opts = {}) => {
  const meta = PHOTOS[ph.id];
  if (!meta) throw new Error(`missing photo ${ph.id}`);
  const ws = meta.widths;
  const pick = opts.size === 'thumb' ? ws[0] : ws.find((w) => w >= 960) || ws[ws.length - 1];
  const srcset = ws.map((w) => `${u(`assets/photo/${ph.id}-${w}.webp`)} ${w}w`).join(', ');
  const pos = opts.pos || ph.pos;
  return `<img src="${u(`assets/photo/${ph.id}-${pick}.webp`)}" srcset="${srcset}" sizes="${SIZES[opts.size || 'card']}" width="${meta.w}" height="${meta.h}" alt="${esc(alt)}"${opts.eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${pos ? ` style="object-position:${pos}"` : ''}${opts.cls ? ` class="${opts.cls}"` : ''}>`;
};
const img = (u, slug, view, alt, opts = {}) => photoImg(u, photoFor(slug, view), alt, opts);
const credit = (id) => { const m = PHOTOS[id]; return `Photograph: ${esc(m.author.split('\n')[0].slice(0, 80))}, ${esc(m.license)}`; };
const altFor = (p, view) => photoFor(p.slug, view).alt;

function header(u, current) {
  const link = (n) => `<a href="${u(n.href)}"${current === n.href ? ' aria-current="page"' : ''}>${n.label}</a>`;
  return `<header class="site-header" data-header>
  <a class="skip" href="#main">Skip to content</a>
  <div class="bar">
    <a class="wordmark" href="${u('')}" aria-label="${esc(B.name)}, home">${esc(B.name)}</a>
    <nav class="primary" aria-label="Primary">${NAV.map(link).join('')}</nav>
    <div class="bar-end">
      <a class="btn btn-line btn-sm cta-head" href="${u('appointment/')}">Private appointment</a>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu-open>Menu</button>
    </div>
  </div>
  <div class="menu" id="menu" data-menu hidden>
    <div class="menu-inner">
      <button class="menu-close" type="button" data-menu-close>Close</button>
      <nav aria-label="Full menu"><ol class="menu-list">
        ${[{ href: '', label: 'Home' }, ...NAV, { href: 'appointment/', label: 'Private appointment' }, ...MORE].map((n, i) => `<li><a href="${u(n.href)}"${current === n.href ? ' aria-current="page"' : ''}><span class="menu-n">${String(i + 1).padStart(2, '0')}</span>${n.label}</a></li>`).join('')}
      </ol></nav>
      <div class="menu-foot">
        <p>${esc(C.address.street)}<br>${esc(C.address.suite)}</p>
        <p><a href="${tel}">${esc(C.contact.phone)}</a><br><a href="${wa(`Hello ${B.name}, I would like to arrange a private viewing.`)}">WhatsApp</a> · <a href="${mailto()}">Email</a></p>
      </div>
    </div>
  </div>
</header>`;
}

function hoursList() {
  return `<dl class="hours">${C.hours.map((h) => `<div><dt>${esc(h.label)}</dt><dd>${h.open} to ${h.close}</dd></div>`).join('')}</dl><p class="small muted">${esc(C.hoursNote)}</p>`;
}

function footer(u) {
  return `<footer class="site-footer">
  <section class="list-signup" aria-labelledby="list-h">
    <div class="wrap narrow center">
      <p class="eyebrow">The private client list</p>
      <h2 id="list-h" class="display-m">Pieces that never appear online are offered here first.</h2>
      <p class="muted">Four letters a year, each with a private lookbook. No offers, no countdowns. Leave whenever you like.</p>
      <form class="inline-form" data-form="list" novalidate>
        <div class="field grow"><label for="list-email">Email address</label><input id="list-email" name="email" type="email" autocomplete="email" required data-required="Enter a valid email address"></div>
        <div class="field"><label for="list-interest">Interested in</label><select id="list-interest" name="interest"><option>Watches and jewelry</option><option>Watches</option><option>High jewelry</option></select></div>
        <button class="btn btn-solid" type="submit">Join the list</button>
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>
    </div>
  </section>
  <div class="wrap foot-grid">
    <div>
      <p class="wordmark foot-mark">${esc(B.name)}</p>
      <p class="muted">${esc(B.tagline)}</p>
    </div>
    <div>
      <h2 class="foot-h">Concierge</h2>
      <ul class="plain">
        <li><a href="${tel}">${esc(C.contact.phone)}</a></li>
        <li><a href="${wa(`Hello ${B.name}, I have a question.`)}">WhatsApp</a></li>
        <li><a href="${mailto()}">${esc(C.contact.email)}</a></li>
      </ul>
    </div>
    <div>
      <h2 class="foot-h">Visit</h2>
      <address>${esc(C.address.street)}<br>${esc(C.address.suite)}<br>${esc(C.address.city)}, ${esc(C.address.region)} ${esc(C.address.postal)}</address>
      ${hoursList()}
    </div>
    <nav aria-label="Footer">
      <h2 class="foot-h">The house</h2>
      <ul class="plain">${[...NAV, { href: 'appointment/', label: 'Private appointment' }, ...MORE].map((n) => `<li><a href="${u(n.href)}">${n.label}</a></li>`).join('')}</ul>
    </nav>
  </div>
  <div class="wrap foot-base">
    <p>© ${new Date().getFullYear()} ${esc(B.name)}. ${esc(B.demoNotice)}</p>
    <p><a href="${u('legal/')}#privacy">Privacy</a> · <a href="${u('legal/')}#terms">Terms</a> · <a href="${u('legal/')}#accessibility">Accessibility</a> · <a href="${u('credits/')}">Image credits</a></p>
  </div>
</footer>`;
}

function layout(page) {
  const u = (to) => rel(page.path, to);
  const url = C.siteUrl + '/' + page.path;
  const title = page.path === '' && !page.noindex ? `${B.name}. ${B.tagline}` : `${page.title} · ${B.name}`;
  const og = `${C.siteUrl}/assets/og.png`;
  const jsonld = [].concat(page.jsonld || []).map((j) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...j }).replace(/</g, '\\u003c')}</script>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>document.documentElement.classList.add('js')</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
${page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="${C.colors.ink}">
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:site_name" content="${esc(B.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${u('favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${u('assets/apple-touch-icon.png')}">
<link rel="manifest" href="${u('site.webmanifest')}">
<link rel="preload" href="${u('assets/fonts/cormorant.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${u('assets/fonts/hanken.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${u('assets/css/tokens.css')}">
<link rel="stylesheet" href="${u('assets/css/site.css')}">
${jsonld}
<script src="${u('assets/js/config.js')}" defer></script>
<script src="${u('assets/js/site.js')}" defer></script>
</head>
<body class="${page.bodyClass || ''}">
${header(u, page.nav ?? page.path)}
<main id="main" tabindex="-1">
${page.body(u)}
</main>
${footer(u)}
</body>
</html>
`;
}

const business = {
  '@type': 'JewelryStore',
  name: B.name,
  description: B.description,
  url: C.siteUrl + '/',
  telephone: C.contact.phone,
  email: C.contact.email,
  image: `${C.siteUrl}/assets/og.png`,
  foundingDate: String(B.founded),
  address: { '@type': 'PostalAddress', streetAddress: `${C.address.street}, ${C.address.suite}`, addressLocality: C.address.city, addressRegion: C.address.region, postalCode: C.address.postal, addressCountry: C.address.country },
  geo: { '@type': 'GeoCoordinates', latitude: C.address.geo.lat, longitude: C.address.geo.lng },
  openingHoursSpecification: C.hours.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: h.days.map((d) => ({ Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' })[d]), opens: h.open, closes: h.close })),
  knowsLanguage: C.languages,
  sameAs: [`https://www.instagram.com/${C.contact.instagram}/`]
};
const crumbs = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${C.siteUrl}/${p}` })) });

function pieceCard(u, p, opts = {}) {
  return `<article class="card reveal${opts.cls ? ' ' + opts.cls : ''}">
  <a class="card-media" href="${u(`pieces/${p.slug}/`)}" data-cursor="View" tabindex="-1" aria-hidden="true">${img(u, p.slug, opts.view || 'front', altFor(p, opts.view || 'front'))}</a>
  <div class="card-body">
    <p class="eyebrow">${esc(p.maker)}</p>
    <h3 class="card-title"><a href="${u(`pieces/${p.slug}/`)}">${esc(p.title)}</a></h3>
    <p class="muted">${esc(p.headline)}</p>
    <p class="card-meta"><span>${esc(p.reference)} · ${esc(p.year)}</span>${p.status === 'available' ? '' : `<span class="tag ${p.status}">${STATUS[p.status]}</span>`}</p>
  </div>
</article>`;
}

function articleCard(u, a) {
  return `<article class="article-card reveal">
  <a class="card-media" href="${u(`journal/${a.slug}/`)}" tabindex="-1" aria-hidden="true">${photoImg(u, { id: a.image }, '', { size: 'card' })}</a>
  <p class="eyebrow"><time datetime="${a.date}">${fmtDate(a.date)}</time> · ${readMins(a)} min read</p>
  <h3 class="card-title"><a href="${u(`journal/${a.slug}/`)}">${esc(a.title)}</a></h3>
  <p class="muted">${esc(a.dek)}</p>
</article>`;
}

const steps = [
  ['Choose a time', 'Pick a morning or afternoon that suits you and tell us what you would like to see. We reply within one working day, usually sooner.'],
  ['We prepare the room', 'Your host sets out the pieces you asked about, with their reports and condition notes, and one or two we think you should see.'],
  ['Visit, unhurried', 'One guest party at a time, about an hour, daylight at the table. Decide there, or take the dossier home and decide later.']
];
const numbered = (list, roman) => list.map(([t, d], i) => `<li class="reveal"><span class="step-n">${roman ? ['I', 'II', 'III', 'IV'][i] : String(i + 1).padStart(2, '0')}</span><h3>${t}</h3><p>${d}</p></li>`).join('');

const hostCard = (h, full) => `<article class="host reveal">
  <div class="host-mark" aria-hidden="true">${h.name.split(' ').map((w) => w[0]).join('')}</div>
  <h3>${esc(h.name)}</h3>
  <p class="eyebrow">${esc(h.role)} · since ${h.since}</p>
  ${full ? `<p>${esc(h.bio)}</p>` : ''}
  <p class="small muted">Speaks ${h.languages.join(', ')}</p>
</article>`;

const concierge = (u, context = 'a private viewing') => `<section class="concierge reveal" aria-label="Concierge contact">
  <p class="eyebrow">Concierge</p>
  <p class="display-s">Prefer to talk first?</p>
  <ul class="concierge-links">
    <li><a href="${tel}">Call ${esc(C.contact.phone)}</a></li>
    <li><a href="${wa(`Hello ${B.name}, I would like to ask about ${context}.`)}">Message on WhatsApp</a></li>
    <li><a href="${mailto(`Enquiry: ${context}`)}">Write to the concierge</a></li>
  </ul>
</section>`;

const pages = [];

pages.push({
  path: '',
  title: 'Home',
  description: B.description,
  bodyClass: 'home has-hero',
  jsonld: [business, { '@type': 'WebSite', name: B.name, url: C.siteUrl + '/' }],
  body: (u) => `<section class="hero" aria-labelledby="hero-h">
  <div class="hero-media" data-parallax>${photoImg(u, { id: 'tank-1' }, 'A Must de Cartier Tank in vermeil with a cream Roman numeral dial, lying in low blue light', { eager: true, size: 'full' })}</div>
  <div class="hero-copy wrap">
    <p class="eyebrow fade-in">By appointment · ${esc(C.address.street.replace(/^\S+\s/, ''))}</p>
    <h1 id="hero-h" class="display-xl fade-in">${esc(B.tagline)}</h1>
    <p class="lede fade-in">${esc(B.description)}</p>
    <p class="actions fade-in"><a class="btn btn-solid" href="${u('appointment/')}">Request a private appointment</a><a class="btn btn-text" href="${u('lookbook/')}">View the lookbook</a></p>
  </div>
  <p class="hero-note small">${credit('tank-1')}. <a href="${u('credits/')}">Image credits</a></p>
</section>

<section class="statement wrap narrow" aria-labelledby="st-h">
  <h2 id="st-h" class="visually-hidden">Our philosophy</h2>
  <p class="display-l reveal">We keep the door closed so the room can be quiet. <em>One guest at a time, daylight on the table, and every question answered in writing.</em></p>
  <p class="signature reveal">${esc(C.hosts[0].name)}, founder</p>
</section>

<section class="featured wrap" aria-labelledby="feat-h">
  <div class="section-head reveal"><p class="eyebrow">Selected pieces</p><h2 id="feat-h" class="display-m">This season in the salon</h2><a class="link-arrow" href="${u('lookbook/')}">The full lookbook</a></div>
  <div class="feature-grid">${pieces.filter((p) => p.featured).map((p, i) => pieceCard(u, p, { cls: `f${i + 1}` })).join('')}</div>
</section>

<section class="how band-olive" aria-labelledby="how-h">
  <div class="wrap">
    <div class="section-head reveal"><p class="eyebrow">A private appointment</p><h2 id="how-h" class="display-m">Three steps, and none of them rushed.</h2></div>
    <ol class="steps">${numbered(steps, true)}</ol>
    <p class="center reveal"><a class="btn btn-line" href="${u('appointment/')}">Choose a time</a></p>
  </div>
</section>

<section class="hosts wrap" aria-labelledby="hosts-h">
  <div class="section-head reveal"><p class="eyebrow">Your hosts</p><h2 id="hosts-h" class="display-m">The names on the door.</h2><a class="link-arrow" href="${u('house/')}">About the house</a></div>
  <div class="host-grid">${C.hosts.map((h) => hostCard(h, true)).join('')}</div>
</section>

<section class="trust band-stone" aria-labelledby="trust-h">
  <div class="wrap trust-inner">
    <h2 id="trust-h" class="display-m reveal">Every watch opened. Every stone reported. Every name on the door.</h2>
    <ul class="trust-facts reveal">
      <li><strong>Since ${B.founded}</strong><span>On the same block, under the same family</span></li>
      <li><strong>Independent reports</strong><span>For every significant stone we offer</span></li>
      <li><strong>Written condition notes</strong><span>By the watchmaker who opened the case</span></li>
    </ul>
    <p class="reveal"><a class="link-arrow" href="${u('authenticity/')}">How we authenticate</a></p>
  </div>
</section>

<section class="journal-teaser wrap" aria-labelledby="jt-h">
  <div class="section-head reveal"><p class="eyebrow">Journal</p><h2 id="jt-h" class="display-m">Notes from the bench</h2><a class="link-arrow" href="${u('journal/')}">All articles</a></div>
  <div class="article-grid">${articles.slice(0, 2).map((a) => articleCard(u, a)).join('')}</div>
</section>

<section class="closing wrap narrow center" aria-labelledby="cl-h">
  <h2 id="cl-h" class="display-l reveal">The room is quietest on weekday mornings.</h2>
  <p class="reveal"><a class="btn btn-solid" href="${u('appointment/')}">Request a private appointment</a></p>
</section>`
});

pages.push({
  path: 'lookbook/',
  title: 'Lookbook',
  description: `The ${B.name} lookbook. Watches and high jewelry in four chapters, each piece available to view privately by appointment.`,
  jsonld: [crumbs([['Home', ''], ['Lookbook', 'lookbook/']]), { '@type': 'CollectionPage', name: `${B.name} Lookbook`, hasPart: pieces.map((p) => ({ '@type': 'Product', name: `${p.maker} ${p.title}`, url: `${C.siteUrl}/pieces/${p.slug}/` })) }],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">Lookbook · Autumn and winter</p>
  <h1 class="display-xl">${pieces.length} pieces, <em>shown slowly.</em></h1>
  <p class="lede">Watches in the salon can be seen by appointment, with prices given privately, in writing, before you visit. Jewels marked as reference pieces are museum and exhibition pieces, shown for the standard we source to.</p>
  <div class="lb-tools">
    <nav class="chapter-index" aria-label="Chapters"><ol>${chapters.map((c) => `<li><a href="#${c.id}"><span>${c.numeral}</span>${esc(c.title)}</a></li>`).join('')}</ol></nav>
    <div class="filter" role="group" aria-label="Show">
      <button type="button" aria-pressed="true" data-filter="all">All</button><button type="button" aria-pressed="false" data-filter="watch">Watches</button><button type="button" aria-pressed="false" data-filter="jewelry">Jewelry</button>
    </div>
  </div>
  <p class="visually-hidden" role="status" aria-live="polite" data-filter-status></p>
</header>
${chapters.map((c) => {
  const list = pieces.filter((p) => p.chapter === c.id);
  return `<section class="chapter" id="${c.id}" aria-labelledby="ch-${c.id}">
  <div class="chapter-open">
    <div class="chapter-media" data-parallax>${photoImg(u, { id: c.image }, '', { size: 'full' })}</div>
    <div class="chapter-copy wrap">
      <p class="chapter-n reveal">Chapter ${c.numeral}</p>
      <h2 id="ch-${c.id}" class="display-xl reveal">${esc(c.title)}</h2>
      <p class="lede reveal">${esc(c.intro)}</p>
    </div>
  </div>
  <div class="wrap">
  ${list.map((p, i) => {
    const view = 'front';
    return `<article class="look${i % 2 ? ' look-rev' : ''}" data-kind="${p.kind}">
    <a class="look-media reveal" href="${u(`pieces/${p.slug}/`)}" data-cursor="View" tabindex="-1" aria-hidden="true">${img(u, p.slug, view, altFor(p, view), { size: 'half' })}</a>
    <div class="look-copy reveal">
      <p class="eyebrow">${esc(p.maker)} · ${esc(p.year)}</p>
      <h3 class="display-m"><a href="${u(`pieces/${p.slug}/`)}">${esc(p.title)}</a></h3>
      <p class="look-line">${esc(p.headline)}</p>
      <p class="muted">${esc(p.story[0])}</p>
      <p class="card-meta"><span>${esc(p.reference)}</span><span class="tag ${p.status}">${STATUS[p.status]}</span></p>
      <p class="actions"><a class="btn btn-line" href="${u(`appointment/?piece=${p.slug}`)}">${p.status === 'reserved' ? 'Ask to be told if it returns' : p.status === 'reference' ? 'Ask us to find one like it' : 'Request to view'}<span class="visually-hidden"> the ${esc(p.title)}</span></a><a class="btn btn-text" href="${u(`pieces/${p.slug}/`)}">The full story<span class="visually-hidden"> of the ${esc(p.title)}</span></a></p>
    </div>
  </article>`;
  }).join('')}
  </div>
</section>`;
}).join('')}
<section class="closing wrap narrow center">
  <p class="display-l reveal">Not every piece is shown here.</p>
  <p class="muted reveal">Some are offered only to the private client list, or in the room. Tell us what you are looking for and we will tell you honestly whether we have it.</p>
  <p class="reveal"><a class="btn btn-solid" href="${u('appointment/')}">Request a private appointment</a></p>
</section>`
});

for (const p of pieces) {
  const ch = chapterOf[p.chapter];
  const others = [...pieces.filter((x) => x.chapter === p.chapter && x.slug !== p.slug), ...pieces.filter((x) => x.chapter !== p.chapter)].slice(0, 3);
  const author = p.kind === 'watch' ? C.hosts[1] : C.hosts[0];
  const views = p.photos;
  const dossier = p.kind === 'watch'
    ? ['Movement photographs and our case measurements', 'Serial check against the papers', 'Verified service history and any replaced parts, sealed', 'Lifetime guarantee of authenticity']
    : ['Independent laboratory report for every significant stone', 'Workshop record of setting and metal', 'Photographs under daylight and loupe', 'Lifetime guarantee of authenticity'];
  pages.push({
    path: `pieces/${p.slug}/`,
    nav: 'lookbook/',
    title: `${p.maker} ${p.title}`,
    description: `${p.maker} ${p.title}, ${p.reference}, ${p.year}. ${p.headline} Price on request. View privately by appointment at ${B.name}.`,
    ogType: 'product',
    jsonld: [
      crumbs([['Home', ''], ['Lookbook', 'lookbook/'], [`${p.maker} ${p.title}`, `pieces/${p.slug}/`]]),
      { '@type': 'Product', name: `${p.maker} ${p.title}`, sku: p.reference, brand: { '@type': 'Brand', name: p.maker }, description: p.story.join(' '), image: views.map((v) => `${C.siteUrl}/assets/photo/${v.id}-${PHOTOS[v.id].widths.find((w) => w >= 960) || PHOTOS[v.id].widths.at(-1)}.webp`), category: p.kind === 'watch' ? 'Watches' : 'Fine jewelry', additionalProperty: p.specs.map(([name, value]) => ({ '@type': 'PropertyValue', name, value })) }
    ],
    body: (u) => `<nav class="crumbs wrap" aria-label="Breadcrumb"><ol><li><a href="${u('lookbook/')}">Lookbook</a></li><li><a href="${u(`lookbook/#${ch.id}`)}">${esc(ch.title)}</a></li><li aria-current="page">${esc(p.title)}</li></ol></nav>
<div class="piece wrap">
  <section class="gallery" aria-label="Images of the piece" data-gallery>
    <figure class="gallery-main">
      ${views.map((v, i) => `<div class="gallery-slide${i ? '' : ' is-active'}" data-slide="${i}"><button type="button" class="zoom" data-zoom="${u(`assets/photo/${v.id}-${PHOTOS[v.id].widths.at(-1)}.webp`)}" data-zoom-alt="${esc(v.alt)}" aria-label="Enlarge image ${i + 1} of ${views.length}">${photoImg(u, v, v.alt, { eager: i === 0, size: 'half' })}</button><p class="slide-credit small muted">${credit(v.id)}</p></div>`).join('')}
    </figure>
    <div class="thumbs" role="group" aria-label="Choose image">${views.length > 1 ? views.map((v, i) => `<button type="button" class="thumb" aria-pressed="${i === 0}" data-thumb="${i}" aria-label="Show image ${i + 1}: ${esc(v.alt)}">${photoImg(u, v, '', { size: 'thumb' })}</button>`).join('') : ''}</div>
  </section>
  <section class="piece-info" aria-labelledby="piece-h">
    <div class="sticky">
      <p class="eyebrow">${esc(p.maker)}</p>
      <h1 id="piece-h" class="display-l">${esc(p.title)}</h1>
      <p class="piece-ref">${esc(p.reference)} · ${esc(p.year)}</p>
      <p class="look-line">${esc(p.headline)}</p>
      <dl class="price-line"><div><dt>Price</dt><dd>${p.status === 'reference' ? 'Not offered. Ask us to source a comparable piece' : 'On request, in writing'}</dd></div><div><dt>Status</dt><dd><span class="tag ${p.status}">${STATUS[p.status]}</span></dd></div></dl>
      <p class="actions stack"><a class="btn btn-solid" href="${u(`appointment/?piece=${p.slug}`)}">${p.status === 'reserved' ? 'Ask to be told if it returns' : p.status === 'reference' ? 'Ask us to find one like it' : 'Request a private viewing'}</a><a class="btn btn-line" href="${wa(`Hello ${B.name}, I would like to ask about the ${p.maker} ${p.title} (${p.reference}).`)}">Ask on WhatsApp</a></p>
      <details class="enquiry">
        <summary>Ask a discreet question, or request the price</summary>
        <form data-form="inquiry" novalidate>
          <div class="form-errors" data-errors tabindex="-1" hidden></div>
          <input type="hidden" name="piece" value="${p.slug}">
          <div class="field"><label for="iq-name">Name</label><input id="iq-name" name="name" autocomplete="name" required data-required="Enter your name"></div>
          <div class="field"><label for="iq-contact">Email or phone</label><input id="iq-contact" name="contact" autocomplete="email" required data-required="Enter an email address or phone number"></div>
          <div class="field"><label for="iq-msg">Your question <span class="opt">optional</span></label><textarea id="iq-msg" name="message" rows="3"></textarea></div>
          <button class="btn btn-line" type="submit">Send privately</button>
          <p class="form-status" role="status" aria-live="polite"></p>
        </form>
      </details>
      <p class="small muted">Prices are shared privately because many pieces are offered on behalf of clients. You will have the figure in writing before you visit.</p>
    </div>
  </section>
</div>
<div class="piece-story wrap">
  <section aria-labelledby="story-h" class="prose">
    <h2 id="story-h" class="eyebrow">The story</h2>
    ${p.story.map((t, i) => `<p${i === 0 ? ' class="lede"' : ''}>${esc(t)}</p>`).join('')}
  </section>
  <section aria-labelledby="prov-h">
    <h2 id="prov-h" class="eyebrow">Provenance</h2>
    <ul class="ticks">${p.provenance.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <h2 class="eyebrow">Condition</h2>
    <blockquote class="note"><p>${esc(p.condition)}</p><footer>Noted by ${esc(author.name)}</footer></blockquote>
  </section>
  <section aria-labelledby="spec-h">
    <h2 id="spec-h" class="eyebrow">Details</h2>
    <dl class="specs">${p.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  </section>
</div>
<section class="dossier band-olive" aria-labelledby="dos-h">
  <div class="wrap dossier-inner">
    <h2 id="dos-h" class="display-m">It goes home with a dossier.</h2>
    <ul class="ticks">${dossier.map((t) => `<li>${t}</li>`).join('')}</ul>
    <a class="link-arrow" href="${u('authenticity/')}">How we authenticate</a>
  </div>
</section>
<section class="related wrap" aria-labelledby="rel-h">
  <div class="section-head"><p class="eyebrow">Also in the salon</p><h2 id="rel-h" class="display-m">You may also wish to see</h2></div>
  <div class="card-row">${others.map((x) => pieceCard(u, x)).join('')}</div>
</section>`
  });
}

pages.push({
  path: 'appointment/',
  title: 'Private appointment',
  description: `Request a private appointment at ${B.name}. Choose a date and time, tell us what you would like to see, and we will prepare the room.`,
  bodyClass: 'appointment-page',
  jsonld: [crumbs([['Home', ''], ['Private appointment', 'appointment/']]), business],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">Private appointment</p>
  <h1 class="display-xl">Choose a time. <em>We will prepare the room.</em></h1>
  <p class="lede">One guest party at a time, about an hour. We confirm every request personally within one working day.</p>
</header>
<div class="appt wrap" data-appointment>
  <div class="appt-main">
    <div class="pending" data-pending hidden></div>
    <form class="appt-form" data-form="appointment" novalidate>
      <div class="form-errors" data-errors tabindex="-1" hidden></div>
      <fieldset class="step">
        <legend><span class="step-n">I</span>Date</legend>
        <div class="cal" data-calendar>
          <div class="cal-head"><button type="button" class="cal-nav" data-cal-prev aria-label="Previous month">‹</button><h2 class="cal-title" data-cal-title aria-live="polite"></h2><button type="button" class="cal-nav" data-cal-next aria-label="Next month">›</button></div>
          <table class="cal-grid"><caption class="visually-hidden">Available dates. Use Tab to move between open days.</caption><thead><tr>${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => `<th scope="col" abbr="${d}"><span aria-hidden="true">${d[0]}</span><span class="visually-hidden">${d}</span></th>`).join('')}</tr></thead><tbody data-cal-body></tbody></table>
          <p class="small muted">Closed days are dimmed. ${esc(C.hoursNote)}</p>
        </div>
        <input type="hidden" name="date" data-required="Choose a date" data-focus="[data-calendar] button.day:not([disabled])">
      </fieldset>
      <fieldset class="step">
        <legend><span class="step-n">II</span>Time</legend>
        <div class="slots" data-slots><p class="muted">Choose a date to see available times.</p></div>
        <input type="hidden" name="time" data-required="Choose a time" data-focus="[data-slots] input">
      </fieldset>
      <fieldset class="step">
        <legend><span class="step-n">III</span>Your visit</legend>
        <div class="field"><span class="label" id="party-l">Guests, including you</span><div class="seg" role="radiogroup" aria-labelledby="party-l">${Array.from({ length: C.appointment.maxParty }, (_, i) => `<label><input type="radio" name="party" value="${i + 1}"${i === 0 ? ' checked' : ''}><span>${i + 1}</span></label>`).join('')}</div></div>
        <div class="field"><span class="label" id="int-l">Interested in</span><div class="chips" role="group" aria-labelledby="int-l">${['Watches', 'High jewelry', 'Engagement', 'Selling or consigning', 'Simply looking'].map((x) => `<label><input type="checkbox" name="interests" value="${x}"><span>${x}</span></label>`).join('')}</div></div>
        <div class="field"><label for="ap-piece">Pieces you would like to see <span class="opt">optional</span></label>
          <ul class="chosen" data-chosen aria-live="polite"></ul>
          <select id="ap-piece" data-piece-select><option value="">Add a piece from the lookbook</option>${chapters.map((c) => `<optgroup label="${esc(c.title)}">${pieces.filter((p) => p.chapter === c.id).map((p) => `<option value="${p.slug}">${esc(`${p.maker} ${p.title}`)}</option>`).join('')}</optgroup>`).join('')}</select>
          <input type="hidden" name="pieces">
        </div>
        <div class="two">
          <div class="field"><label for="ap-lang">Preferred language</label><select id="ap-lang" name="language">${C.languages.map((l) => `<option>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="ap-host">Host</label><select id="ap-host" name="host"><option value="">No preference</option>${C.hosts.map((h) => `<option>${esc(h.name)}</option>`).join('')}</select></div>
        </div>
      </fieldset>
      <fieldset class="step">
        <legend><span class="step-n">IV</span>Your details</legend>
        <div class="two">
          <div class="field"><label for="ap-name">Name</label><input id="ap-name" name="name" autocomplete="name" required data-required="Enter your name"></div>
          <div class="field"><label for="ap-email">Email</label><input id="ap-email" name="email" type="email" autocomplete="email" required data-required="Enter a valid email address"></div>
        </div>
        <div class="field"><label for="ap-phone">Phone <span class="opt">needed for phone or WhatsApp</span></label><input id="ap-phone" name="phone" type="tel" autocomplete="tel"></div>
        <div class="field"><span class="label" id="cp-l">How should we confirm?</span><div class="seg" role="radiogroup" aria-labelledby="cp-l">${['Email', 'Phone', 'WhatsApp'].map((x, i) => `<label><input type="radio" name="contactPref" value="${x}"${i ? '' : ' checked'}><span>${x}</span></label>`).join('')}</div></div>
        <div class="field checks">
          <label class="check"><input type="checkbox" name="discreetArrival" value="yes"><span>I would prefer a discreet arrival by the side entrance</span></label>
          <label class="check"><input type="checkbox" name="noVoicemail" value="yes"><span>Please do not leave voicemail or send calendar invitations</span></label>
        </div>
        <div class="field"><label for="ap-note">Anything we should know <span class="opt">optional</span></label><textarea id="ap-note" name="note" rows="3" aria-describedby="ap-note-h"></textarea><p class="hint" id="ap-note-h">For example, if the name on your photo ID differs from the name above, or if you would like us to come to you.</p></div>
        <label class="check"><input type="checkbox" name="consent" value="yes" required data-required="Agree to the privacy notice"><span>I agree that ${esc(B.name)} may use these details to arrange my visit, as described in the <a href="${u('legal/')}#privacy">privacy notice</a>.</span></label>
      </fieldset>
      <div class="submit-row"><button class="btn btn-solid btn-lg" type="submit">Request appointment</button><p class="small muted">No payment and no obligation. We confirm personally.</p></div>
    </form>
    <section class="confirm" data-confirm hidden tabindex="-1" aria-label="Request received"></section>
  </div>
  <aside class="appt-side" aria-label="Your request">
    <div class="sticky">
      <div class="summary">
        <p class="eyebrow">Your request</p>
        <dl>
          <div><dt>Date</dt><dd data-sum="date">Not chosen</dd></div>
          <div><dt>Time</dt><dd data-sum="time">Not chosen</dd></div>
          <div><dt>Guests</dt><dd data-sum="party">1</dd></div>
          <div><dt>Pieces</dt><dd data-sum="pieces">Open to suggestion</dd></div>
        </dl>
      </div>
      <div class="side-note">
        <p class="eyebrow">At the salon</p>
        <p>${esc(C.address.street)}<br>${esc(C.address.suite)}<br>${esc(C.address.crossStreets)}</p>
        <p class="small muted">Please bring photo identification for the building's front desk.</p>
        <a class="link-arrow" href="${u('visit/')}">Arrival and security</a>
      </div>
      ${concierge(u)}
    </div>
  </aside>
</div>
<script type="application/json" id="qb-pieces">${JSON.stringify(Object.fromEntries(pieces.map((p) => [p.slug, { name: `${p.maker} ${p.title}`, status: p.status }]))).replace(/</g, '\\u003c')}</script>`
});

pages.push({
  path: 'house/',
  title: 'The House',
  description: `${B.name} has shown watches and high jewelry privately on West 47th Street since ${B.founded}. Meet the people who will host you.`,
  jsonld: [crumbs([['Home', ''], ['The House', 'house/']]), { '@type': 'AboutPage', name: `About ${B.name}` }, ...C.hosts.map((h) => ({ '@type': 'Person', name: h.name, jobTitle: h.role, worksFor: { '@type': 'Organization', name: B.name }, knowsLanguage: h.languages }))],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">The House</p>
  <h1 class="display-xl">Fourteen floors above the street, <em>since ${B.founded}.</em></h1>
  <p class="lede">${esc(B.name)} began as a single setting bench and a promise that no client would ever be rushed. The bench is still there. So is the promise.</p>
</header>
<figure class="wide-figure"><div class="wide-media" data-parallax>${photoImg(u, { id: 'ed_47th2-1' }, 'Diamond-shaped streetlights at the Fifth Avenue end of West 47th Street, the Diamond District, with towers behind', { size: 'full' })}</div></figure>
<section class="wrap timeline-wrap" aria-labelledby="hist-h">
  <h2 id="hist-h" class="eyebrow">History</h2>
  <ol class="timeline">
    <li class="reveal"><span class="year">${B.founded}</span><p>${esc(C.hosts[0].name)} rents a single room on the fourteenth floor and sets stones for other jewellers by day, for private clients by night.</p></li>
    <li class="reveal"><span class="year">1996</span><p>The first watches arrive, consigned by clients who wanted them sold quietly. They still are.</p></li>
    <li class="reveal"><span class="year">2011</span><p>${esc(C.hosts[1].name)} joins from the bench and begins writing the condition notes that accompany every watch.</p></li>
    <li class="reveal"><span class="year">2016</span><p>${esc(C.hosts[2].name)} opens the private client service for collectors who buy across time zones.</p></li>
    <li class="reveal"><span class="year">Today</span><p>Three hosts, one room, around two hundred pieces a year, and no sign on the door.</p></li>
  </ol>
</section>
<section class="values band-olive" aria-labelledby="val-h">
  <div class="wrap">
    <h2 id="val-h" class="display-m reveal">What we hold to</h2>
    <div class="value-grid">
      <div class="reveal"><h3>Discretion</h3><p>We do not photograph clients, publish sales, or name sellers. What happens in the room stays in the room.</p></div>
      <div class="reveal"><h3>Proof</h3><p>Every claim on this site is backed by a document you can hold: a laboratory report, a service record, a set of measurements.</p></div>
      <div class="reveal"><h3>Patience</h3><p>Nothing here is on sale and nothing expires tonight. If a piece is right for you, it will still be right next week.</p></div>
    </div>
  </div>
</section>
<section class="wrap hosts" aria-labelledby="hosts-h2">
  <div class="section-head"><p class="eyebrow">Your hosts</p><h2 id="hosts-h2" class="display-m">You will always know who you are speaking to.</h2></div>
  <div class="host-grid">${C.hosts.map((h) => hostCard(h, true)).join('')}</div>
</section>
<section class="wrap narrow center closing">
  <p class="display-l reveal">Come and see the room.</p>
  <p class="reveal"><a class="btn btn-solid" href="${u('appointment/')}">Request a private appointment</a></p>
</section>`
});

pages.push({
  path: 'authenticity/',
  title: 'Authenticity and provenance',
  description: `How ${B.name} authenticates every watch and stone before it is offered: opened cases, measured lugs, serial checks, and independent laboratory reports.`,
  jsonld: [crumbs([['Home', ''], ['Authenticity', 'authenticity/']])],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">Authenticity and provenance</p>
  <h1 class="display-xl">We would rather lose a piece <em>than explain one later.</em></h1>
  <p class="lede">Buyers on 47th Street are right to worry about replaced parts, refinished dials, and stones that are not what the paper says. This is what we do about it, every time.</p>
</header>
<section class="wrap proc" aria-labelledby="w-h">
  <div class="proc-head"><p class="eyebrow">Watches</p><h2 id="w-h" class="display-m">Six checks before a watch is photographed</h2></div>
  <ol class="proc-list">${numbered([['Open the case', 'Under a dust cover, by a watchmaker. Calibre and serial are compared to the case and to the papers.'], ['Read the dial', 'Under ten times magnification for printing relief, lume consistency, and signs of refinishing.'], ['Measure the case', 'Lug thickness and bevels compared to factory references to judge polishing honestly.'], ['Check the parts', 'Hands, crown, crystal, and bracelet are matched to the reference and the year.'], ['Time it', 'Twenty-four hours on a timing machine in five positions. Results go in the dossier.'], ['Write it down', 'Plain-language condition notes, including what a seller might prefer to leave out.']])}</ol>
</section>
<section class="wrap proc" aria-labelledby="s-h">
  <div class="proc-head"><p class="eyebrow">Diamonds and coloured stones</p><h2 id="s-h" class="display-m">Four checks before a stone is set</h2></div>
  <ol class="proc-list">${numbered([['Independent report', 'Every significant stone carries a report from an independent gemmological laboratory. We do not grade our own stones.'], ['Inscription check', 'Where a girdle inscription exists, we match it to the report under the loupe.'], ['Origin and treatment', 'Coloured stones are reported for origin and treatment. We say clearly when a stone is enhanced.'], ['Daylight viewing', 'We judge colour by a north window and a daylight lamp, never under display spots.']])}</ol>
</section>
<section class="band-stone" aria-labelledby="g-h">
  <div class="wrap two-col">
    <div><h2 id="g-h" class="display-m">A guarantee without an expiry date.</h2></div>
    <div class="prose"><p>If any piece we sell is ever shown not to be what we described, we will refund the full price you paid. There is no time limit, and the guarantee passes to the next owner with the dossier.</p><p>We will not sell watches with replaced dials described as original, stones without a report where one is customary, or anything whose ownership we cannot trace.</p></div>
  </div>
</section>
<section class="wrap" aria-labelledby="d-h">
  <div class="section-head"><p class="eyebrow">The dossier</p><h2 id="d-h" class="display-m">What you take home</h2></div>
  <ul class="dossier-grid">${['Photographs of the movement or stone', 'Case measurements and timing results', 'Laboratory reports, original and translated', 'Service history we have verified', 'Replaced parts, sealed and labelled', 'A signed letter of authenticity'].map((t) => `<li class="reveal">${t}</li>`).join('')}</ul>
</section>
<section class="wrap narrow center closing"><p class="display-l reveal">See the process for yourself.</p><p class="muted reveal">Ask during your appointment and ${esc(C.hosts[1].name.split(' ')[0])} will open a case in front of you.</p><p class="reveal"><a class="btn btn-solid" href="${u('appointment/')}">Request a private appointment</a></p></section>`
});

pages.push({
  path: 'consign/',
  title: 'Sell or consign discreetly',
  description: `Sell or consign a watch or piece of jewelry privately through ${B.name}. A written offer or consignment terms, and no public listing without your consent.`,
  jsonld: [crumbs([['Home', ''], ['Sell or consign', 'consign/']])],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">Sell or consign</p>
  <h1 class="display-xl">Let something go, <em>quietly.</em></h1>
  <p class="lede">Many pieces in our lookbook are offered on behalf of private clients. Your name is never published, your serials are never posted, and nothing is listed without your agreement in writing.</p>
</header>
<section class="wrap two-options" aria-label="Options">
  <article class="option reveal"><p class="eyebrow">Sell outright</p><h2 class="display-m">A written offer within two working days.</h2><p>We make a firm offer after we have seen the piece. Payment by bank transfer the same day you accept.</p></article>
  <article class="option reveal"><p class="eyebrow">Consign</p><h2 class="display-m">Shown privately to the right buyer.</h2><p>We authenticate, photograph, and present the piece to clients we know. The commission is agreed in writing before anything else happens.</p></article>
</section>
<section class="band-olive" aria-labelledby="cp-h">
  <div class="wrap">
    <h2 id="cp-h" class="display-m reveal">How it works</h2>
    <ol class="steps four">${numbered([['Tell us about it', 'Use the form below or call. Photographs help but are not required.'], ['A first opinion', 'Within one working day, a host replies with a candid view of what is possible.'], ['An appointment', 'We see the piece in the salon or at your home, open it, and test it.'], ['Your decision', 'A written offer or consignment terms. Take as long as you need.']])}</ol>
  </div>
</section>
<section class="wrap form-wrap" aria-labelledby="cf-h">
  <div class="form-intro"><h2 id="cf-h" class="display-m">Tell us about the piece</h2><p class="muted">Only your name and email are required. We reply within one working day.</p>${concierge(u, 'selling or consigning a piece')}</div>
  <div>
  <form class="std-form" data-form="consign" novalidate>
    <div class="form-errors" data-errors tabindex="-1" hidden></div>
    <div class="two">
      <div class="field"><label for="cs-name">Name</label><input id="cs-name" name="name" autocomplete="name" required data-required="Enter your name"></div>
      <div class="field"><label for="cs-email">Email</label><input id="cs-email" name="email" type="email" autocomplete="email" required data-required="Enter a valid email address"></div>
    </div>
    <div class="two">
      <div class="field"><label for="cs-phone">Phone <span class="opt">optional</span></label><input id="cs-phone" name="phone" type="tel" autocomplete="tel"></div>
      <div class="field"><label for="cs-pref">Contact by</label><select id="cs-pref" name="contactPref"><option>Email</option><option>Phone</option><option>WhatsApp</option></select></div>
    </div>
    <div class="field"><span class="label" id="cs-kind-l">The piece is</span><div class="seg" role="radiogroup" aria-labelledby="cs-kind-l">${['A watch', 'Jewelry', 'A collection'].map((x, i) => `<label><input type="radio" name="kind" value="${x}"${i ? '' : ' checked'}><span>${x}</span></label>`).join('')}</div></div>
    <div class="two">
      <div class="field"><label for="cs-maker">Maker and model</label><input id="cs-maker" name="maker"></div>
      <div class="field"><label for="cs-year">Year, roughly</label><input id="cs-year" name="year" inputmode="numeric"></div>
    </div>
    <div class="field"><label for="cs-ref">Reference or report number <span class="opt">optional, never published</span></label><input id="cs-ref" name="reference"></div>
    <div class="field"><span class="label" id="cs-set-l">Box and papers</span><div class="seg" role="radiogroup" aria-labelledby="cs-set-l">${['Full set', 'Papers only', 'Neither', 'Not sure'].map((x, i) => `<label><input type="radio" name="set" value="${x}"${i === 3 ? ' checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
    <div class="field"><span class="label" id="cs-int-l">I am thinking of</span><div class="seg" role="radiogroup" aria-labelledby="cs-int-l">${['Selling', 'Consigning', 'Not sure yet'].map((x, i) => `<label><input type="radio" name="intent" value="${x}"${i === 2 ? ' checked' : ''}><span>${x}</span></label>`).join('')}</div></div>
    <div class="field"><label for="cs-photos">Photographs <span class="opt">optional</span></label><input id="cs-photos" name="photos" type="file" accept="image/*" multiple aria-describedby="cs-photos-h"><p class="hint" id="cs-photos-h">Front, back, and any papers. In this demonstration, files stay on your device.</p></div>
    <div class="field"><label for="cs-note">Anything else <span class="opt">optional</span></label><textarea id="cs-note" name="note" rows="4"></textarea></div>
    <label class="check"><input type="checkbox" name="consent" value="yes" required data-required="Agree to the privacy notice"><span>I agree to be contacted about this piece, as described in the <a href="${u('legal/')}#privacy">privacy notice</a>.</span></label>
    <div class="submit-row"><button class="btn btn-solid btn-lg" type="submit">Send in confidence</button></div>
  </form>
  <section class="confirm" data-confirm hidden tabindex="-1" aria-label="Message received"></section>
  </div>
</section>`
});

pages.push({
  path: 'journal/',
  title: 'Journal',
  description: `Short notes from the ${B.name} bench on authentication, diamonds, patina, and private viewings.`,
  jsonld: [crumbs([['Home', ''], ['Journal', 'journal/']]), { '@type': 'Blog', name: `${B.name} Journal`, blogPost: articles.map((a) => ({ '@type': 'BlogPosting', headline: a.title, datePublished: a.date, url: `${C.siteUrl}/journal/${a.slug}/` })) }],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">Journal</p>
  <h1 class="display-xl">Notes from the bench.</h1>
  <p class="lede">Written by the people who open the cases and choose the stones. Read slowly.</p>
</header>
<section class="wrap journal-list" aria-label="Articles">
  ${articles.map((a, i) => `<article class="journal-row reveal${i === 0 ? ' lead' : ''}">
    <a class="card-media" href="${u(`journal/${a.slug}/`)}" tabindex="-1" aria-hidden="true">${photoImg(u, { id: a.image }, '', { size: 'card' })}</a>
    <div>
      <p class="eyebrow"><time datetime="${a.date}">${fmtDate(a.date)}</time> · ${esc(a.author)} · ${readMins(a)} min read</p>
      <h2 class="display-m"><a href="${u(`journal/${a.slug}/`)}">${esc(a.title)}</a></h2>
      <p class="muted">${esc(a.dek)}</p>
    </div>
  </article>`).join('')}
</section>`
});

articles.forEach((a, idx) => {
  const next = articles[(idx + 1) % articles.length];
  const p = bySlug[a.piece];
  const host = C.hosts.find((h) => h.name === a.author);
  pages.push({
    path: `journal/${a.slug}/`,
    nav: 'journal/',
    title: a.title,
    description: a.dek,
    ogType: 'article',
    jsonld: [crumbs([['Home', ''], ['Journal', 'journal/'], [a.title, `journal/${a.slug}/`]]), { '@type': 'Article', headline: a.title, description: a.dek, datePublished: a.date, author: { '@type': 'Person', name: a.author }, publisher: { '@type': 'Organization', name: B.name }, image: `${C.siteUrl}/assets/photo/${a.image}-960.webp`, mainEntityOfPage: `${C.siteUrl}/journal/${a.slug}/` }],
    body: (u) => `<article class="article">
  <header class="article-head wrap narrow">
    <p class="eyebrow"><a href="${u('journal/')}">Journal</a> · <time datetime="${a.date}">${fmtDate(a.date)}</time> · ${readMins(a)} min read</p>
    <h1 class="display-xl">${esc(a.title)}</h1>
    <p class="lede">${esc(a.dek)}</p>
    <p class="byline">By ${esc(a.author)}${host ? `, ${esc(host.role.toLowerCase())}` : ''}</p>
  </header>
  <figure class="wide-figure"><div class="wide-media">${photoImg(u, { id: a.image }, a.imageAlt, { eager: true, size: 'full' })}</div><figcaption class="wrap small muted">${esc(a.imageAlt)}. ${credit(a.image)}.</figcaption></figure>
  <div class="article-body wrap narrow prose">
    ${a.body.map((b) => (b.p ? `<p>${esc(b.p)}</p>` : b.h ? `<h2>${esc(b.h)}</h2>` : `<blockquote class="pull"><p>${esc(b.q)}</p></blockquote>`)).join('\n    ')}
  </div>
  <footer class="article-foot wrap narrow">
    ${host ? hostCard(host, false) : ''}
    <div class="article-piece"><p class="eyebrow">Mentioned in this article</p><a class="mini-piece" href="${u(`pieces/${p.slug}/`)}">${img(u, p.slug, 'front', '', { size: 'thumb' })}<span><strong>${esc(p.maker)} ${esc(p.title)}</strong><span class="muted">${esc(p.headline)}</span></span></a></div>
    <p class="next"><span class="eyebrow">Next</span><a class="display-s" href="${u(`journal/${next.slug}/`)}">${esc(next.title)}</a></p>
  </footer>
</article>`
  });
});

const mapSvg = () => `<svg class="map" viewBox="0 0 800 520" role="img" aria-labelledby="map-t map-d"><title id="map-t">Map of the salon's block</title><desc id="map-d">The salon is on West 47th Street between Fifth and Sixth Avenues, mid-block on the north side. The nearest subway is 47-50 Streets Rockefeller Center on Sixth Avenue.</desc>
  <rect width="800" height="520" fill="var(--olive)"/>
  <g fill="var(--olive-soft)">${[[20, 40], [290, 40], [550, 40], [20, 280], [290, 280], [550, 280]].map(([x, y]) => `<rect x="${x}" y="${y}" width="230" height="200" rx="2"/>`).join('')}</g>
  <g font-family="Hanken Grotesk, sans-serif" font-size="12" letter-spacing="2.5" fill="var(--stone-muted)"><text x="400" y="265" text-anchor="middle">WEST 47TH STREET</text><text x="400" y="27" text-anchor="middle">WEST 48TH STREET</text><text x="400" y="505" text-anchor="middle">WEST 46TH STREET</text><text x="270" y="160" transform="rotate(-90 270 160)" text-anchor="middle">SIXTH AVENUE</text><text x="530" y="160" transform="rotate(-90 530 160)" text-anchor="middle">FIFTH AVENUE</text></g>
  <circle cx="410" cy="214" r="24" fill="none" stroke="var(--brass)" stroke-width="1.5"/><circle cx="410" cy="214" r="6" fill="var(--brass)"/>
  <text x="410" y="176" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="24" fill="var(--stone)">${esc(B.name)}</text>
  <g font-family="Hanken Grotesk, sans-serif" font-size="11" letter-spacing="1.5" fill="var(--stone-muted)"><circle cx="270" cy="62" r="10" fill="none" stroke="var(--stone-muted)"/><text x="262" y="92">B D F M</text></g>
</svg>`;

pages.push({
  path: 'visit/',
  title: 'Visit',
  description: `Visit ${B.name} at ${fullAddress}. Arrival instructions, security, discretion, and hours.`,
  jsonld: [crumbs([['Home', ''], ['Visit', 'visit/']]), business],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">Visit</p>
  <h1 class="display-xl">Upstairs, <em>and easy to miss.</em></h1>
  <p class="lede">There is no sign on our door. That is deliberate. Here is everything you need to find us.</p>
</header>
<section class="wrap visit-grid" aria-label="Location and hours">
  <div class="reveal">${mapSvg()}<p class="small muted">Schematic map. Demonstration address.</p></div>
  <div class="visit-info">
    <h2 class="eyebrow">Address</h2>
    <address class="display-s">${esc(C.address.street)}<br>${esc(C.address.suite)}<br>${esc(C.address.city)}, ${esc(C.address.region)} ${esc(C.address.postal)}</address>
    <p class="muted">${esc(C.address.crossStreets)}. Subway B, D, F, or M to 47-50 Streets Rockefeller Center.</p>
    <h2 class="eyebrow">Appointment hours</h2>
    ${hoursList()}
    <p><a class="btn btn-solid" href="${u('appointment/')}">Request a private appointment</a></p>
  </div>
</section>
<section class="band-olive" aria-labelledby="arr-h">
  <div class="wrap">
    <h2 id="arr-h" class="display-m reveal">On arrival</h2>
    <ol class="steps">${numbered([['The lobby', 'Give your name and photo identification at the front desk. They will have it on their list from your confirmation.'], ['The fourteenth floor', 'Take the right-hand elevators and turn left. Suite 1400 is the unmarked walnut door at the end of the corridor.'], ['The bell', 'Ring once. Your host opens the door personally. The outer door locks behind you, which is normal and for your security.']], true)}</ol>
  </div>
</section>
<section class="wrap two-col" aria-labelledby="sec-h">
  <div><h2 id="sec-h" class="display-m">Discretion and security</h2></div>
  <div class="prose">
    <p>We never photograph clients, post visits, or share our appointment book. The building has round-the-clock security, and the salon is monitored inside and out.</p>
    <p>If you would rather not be seen arriving, ask for the side entrance on West 48th Street when you book, and your host will meet you there. For larger purchases we can arrange armoured delivery, or a viewing at your home, office, or hotel.</p>
    <p>If you can, avoid wearing visible jewelry on the street on your way to us. It is a small precaution the whole block takes seriously.</p>
  </div>
</section>
<div class="wrap">${concierge(u, 'directions to the salon')}</div>`
});

pages.push({
  path: 'faq/',
  title: 'Questions',
  description: `Answers about appointments, pricing, authenticity, payment, and delivery at ${B.name}.`,
  jsonld: [crumbs([['Home', ''], ['Questions', 'faq/']]), { '@type': 'FAQPage', mainEntity: faqGroups.flatMap((g) => g.items.map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } }))) }],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">Questions</p>
  <h1 class="display-xl">Asked often, <em>answered plainly.</em></h1>
</header>
<div class="wrap faq">
  ${faqGroups.map((g, gi) => `<section aria-labelledby="fq-${gi}"><h2 id="fq-${gi}" class="eyebrow">${esc(g.title)}</h2>${g.items.map((i) => `<details class="qa"><summary>${esc(i.q)}</summary><p>${esc(i.a)}</p></details>`).join('')}</section>`).join('')}
  ${concierge(u, 'a question not answered here')}
</div>`
});

pages.push({
  path: 'legal/',
  title: 'Legal and privacy',
  description: `Privacy notice, terms of sale, accessibility statement, and demonstration notice for ${B.name}.`,
  jsonld: [crumbs([['Home', ''], ['Legal', 'legal/']])],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">Legal</p>
  <h1 class="display-xl">The small print, <em>in plain words.</em></h1>
  <nav aria-label="On this page" class="toc"><a href="#demo">Demonstration notice</a><a href="#privacy">Privacy</a><a href="#terms">Terms of sale</a><a href="#accessibility">Accessibility</a></nav>
</header>
<div class="wrap narrow prose legal">
  <section id="demo"><h2>Demonstration notice</h2><p>${esc(B.demoNotice)} Product and editorial images are real photographs used under free licences; see the <a href="${u('credits/')}">image credits</a>. Pieces marked as reference are held by museums or were exhibited publicly. No piece shown here is for sale, and no request made on this site is sent anywhere. Requests are stored only in your own browser so that the flow can be demonstrated.</p></section>
  <section id="privacy"><h2>Privacy</h2><p>We collect only what you give us: your name, contact details, and what you tell us about your visit or your piece. We use it to arrange appointments, answer enquiries, and, if you ask, send the private client letter.</p><p>We do not sell or share your details, run advertising trackers, or use cookies for marketing. Identity details required by law for larger purchases are kept securely for the period the law requires and no longer.</p><p>To see, correct, or delete what we hold about you, write to <a href="${mailto('Privacy request')}">${esc(C.contact.email)}</a>.</p></section>
  <section id="terms"><h2>Terms of sale</h2><p>Prices are given in writing and are valid for seven days unless agreed otherwise. A piece is reserved once a deposit is received and sold once paid in full. Pieces bought in the salon may be returned unworn within fourteen days in the condition they left. Custom work and resized rings are not returnable.</p><p>Every piece is sold with our lifetime guarantee of authenticity, described on the <a href="${u('authenticity/')}">Authenticity</a> page.</p></section>
  <section id="accessibility"><h2>Accessibility</h2><p>This site aims to meet WCAG 2.2 level AA. It works with a keyboard and a screen reader, respects your reduced motion setting, and keeps text contrast at or above 4.5 to 1. The salon is step-free from the lobby by elevator. If anything gets in your way, call ${esc(C.contact.phone)} and we will help.</p></section>
</div>`
});

pages.push({
  path: 'credits/',
  title: 'Image credits',
  description: `Photographers, licences, and sources for every image on ${B.name}.`,
  jsonld: [crumbs([['Home', ''], ['Image credits', 'credits/']])],
  body: (u) => `<header class="page-head wrap">
  <p class="eyebrow">Image credits</p>
  <h1 class="display-xl">Every photograph, <em>credited.</em></h1>
  <p class="lede">The images on this site are real photographs published under free licences on Wikimedia Commons. Each is self-hosted, resized, and credited below with its author, licence, and source.</p>
</header>
<div class="wrap credits">
  <ul class="credit-list">${Object.entries(PHOTOS).map(([id, m]) => `<li><span class="credit-thumb">${photoImg(u, { id }, '', { size: 'thumb' })}</span><span><strong>${esc(m.title)}</strong><br>${esc(m.author.split('\n')[0].slice(0, 120))}. ${m.licenseUrl ? `<a href="${esc(m.licenseUrl)}" rel="license noopener">${esc(m.license)}</a>` : esc(m.license)}. <a href="${esc(m.source)}" rel="noopener">Source</a></span></li>`).join('')}</ul>
</div>`
});

const notFound = {
  path: '',
  noindex: true,
  title: 'Page not found',
  description: 'This page could not be found.',
  nav: '404',
  body: (u) => `<section class="wrap narrow center closing notfound"><p class="eyebrow">404</p><h1 class="display-xl">This door does not open.</h1><p class="lede">The page you were looking for has moved, or never existed.</p><p class="actions center"><a class="btn btn-solid" href="${u('')}">Return home</a><a class="btn btn-text" href="${u('lookbook/')}">The lookbook</a></p></section>`
};

function write(rel, content) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

const cssVar = { ink: 'ink', olive: 'olive', oliveSoft: 'olive-soft', line: 'line', stone: 'stone', stoneMuted: 'stone-muted', stoneDeep: 'stone-deep', brass: 'brass', brassBright: 'brass-bright', brassDeep: 'brass-deep' };
const tokensCss = `/* Generated from site.config.json by build/build.mjs. Edit the config, not this file. */\n:root {\n${Object.entries(cssVar).map(([k, v]) => `  --${v}: ${C.colors[k]};`).join('\n')}\n}\n`;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${C.colors.ink}"/><rect x="4.5" y="4.5" width="55" height="55" rx="10" fill="none" stroke="${C.colors.brass}" stroke-opacity=".6"/><text x="32" y="42" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="26" fill="${C.colors.stone}">${esc(B.monogram)}</text></svg>`;


for (const page of pages) write(`${page.path}index.html`, layout(page));
write('404.html', layout(notFound).replace(/(href|src)="\.\//g, '$1="/'));
write('assets/css/tokens.css', tokensCss);
write('assets/js/config.js', `window.QB_CONFIG = ${JSON.stringify({ brand: B.name, email: C.contact.email, phone: C.contact.phone, whatsapp: C.contact.whatsapp, address: fullAddress, hours: C.hours, hoursNote: C.hoursNote, appointment: C.appointment })};\n`);
write('favicon.svg', favicon);
write('site.webmanifest', JSON.stringify({ name: B.name, short_name: B.name, start_url: './', display: 'browser', background_color: C.colors.ink, theme_color: C.colors.ink, icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }, { src: 'assets/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] }, null, 2));
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${C.siteUrl}/sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${C.siteUrl}/${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
write('tools/og.html', `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="../assets/css/tokens.css"><style>@font-face{font-family:C;src:url(../assets/fonts/cormorant.woff2)}@font-face{font-family:CI;src:url(../assets/fonts/cormorant-italic.woff2)}@font-face{font-family:H;src:url(../assets/fonts/hanken.woff2)}body{margin:0;width:1200px;height:630px;position:relative;overflow:hidden;background:var(--ink);color:var(--stone)}img{position:absolute;right:0;top:0;height:630px;width:auto}.c{position:absolute;left:72px;bottom:72px;width:620px}p{font:500 14px/1 H;letter-spacing:.3em;text-transform:uppercase;color:var(--brass);margin:0 0 28px}h1{font:300 88px/1 C;margin:0}h2{font:300 38px/1.15 CI;margin:18px 0 0;color:var(--stone-muted)}</style><img src="../assets/photo/tank-1-1600.webp" alt=""><div class="c"><p>By appointment · New York</p><h1>${esc(B.name)}</h1><h2>${esc(B.tagline)}</h2></div>`);
write('tools/icon.html', `<!doctype html><meta charset="utf-8"><style>body{margin:0}img{width:180px;height:180px;display:block}</style><img src="../favicon.svg" alt="">`);
console.log(`built ${pages.length + 1} pages and ${Object.keys(PHOTOS).length} photographs`);
