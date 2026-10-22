# PALSKY

Drone light shows that tell the story of a culture, across the night sky. Born in Accra, made for the world.

This repository is the PALSKY website, published by GitHub Pages at https://palskystudios.github.io.
It is a static site with no build step and no server.

## Files

| File | What it is |
|---|---|
| `index.html` | The page: content, meta and sharing tags, structured data |
| `app.css` | All styles, including the self-hosted `@font-face` rules |
| `app.js` | The night sky, the drone fleet and page behaviour |
| `guard.js` | Clickjacking guard; runs first, in `<head>` |
| `fonts/` | Font files (latin subsets, woff2) and their licences in `fonts/licences/` |
| `og.jpg` | Share image (1200 × 630) for link previews |
| `logo-512.png`, `apple-touch-icon.png` | Logomark for search results and phone home screens |
| `robots.txt`, `sitemap.xml` | Files for search engines |
| `_headers`, `netlify.toml` | Security headers for Cloudflare Pages / Netlify (GitHub Pages ignores them) |

## Security

The Content-Security-Policy in `index.html` allows code, styles and fonts from this site only, and nothing inline
may run (`script-src 'self'; style-src 'self'`). Keep the meta tag, `_headers` and `netlify.toml` identical
(the header copies also carry `frame-ancestors 'none'`, which a meta tag cannot). Any new script or style goes in
`app.js` / `app.css`, never inline.

## Speed: before and after

Lighthouse 12.6.1, mobile, simulated slow 4G, median of runs on the same machine
(before: 3 runs of the site as of commit `4bb0254`; after: 5 runs).

| Measure | Before | After |
|---|---|---|
| Performance score | 80 | 98 |
| First Contentful Paint | 3.5 s | 1.7 s |
| Largest Contentful Paint | 3.5 s | 2.3 s |
| Speed Index | 5.0 s | 1.7 s |
| Main-thread work | 5.3 s | 2.3 s |
| Total Blocking Time | 0 ms* | 26 ms |
| Page weight | 237 KB | 215 KB |
| Requests to other sites | 8 | 0 |

\* Before, the sky waited up to 2.5 s for Google Fonts, so its start-up work fell outside Lighthouse's
blocking-time window. Measured directly in Chrome (long tasks in the first 5 s, CPU slowed 4×, 390 px screen),
blocking time went from about 480 ms to 190 ms.

Other measurements:

- Slow device (CPU slowed 6×): the page steps its quality down by itself and settles at about 30 fps on a desktop
  screen (from 11 fps); a fast desktop stays at the top level (60 fps).
- Accessibility: all page text meets WCAG AA contrast against the brightest sky behind it
  (lowest 5.15:1 on desktop and phone).
- Not yet measured: frame rate and battery use over one minute on a real low-end Android phone.
