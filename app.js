// PALSKY website: night sky, drone fleet and page behaviour
document.body.classList.remove('no-js');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Copy email =====
document.getElementById('copyEmail').addEventListener('click', async e => {
  const btn = e.currentTarget, email = 'palskystudios@gmail.com';
  let ok = false;
  try { await navigator.clipboard.writeText(email); ok = true; } catch (err) {}
  btn.textContent = ok ? 'Copied ✓' : email;
  if (ok) setTimeout(() => { btn.textContent = email; }, 2000);
});

// ===== Reveal copy as it scrolls in =====
const io = new IntersectionObserver(entries => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));

// ===== The sky: stars, city, horizon and the drone fleet =====
(function sky() {
  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  const label = document.getElementById('formationName');
  const caption = document.querySelector('.live');
  const bar = document.querySelector('.bar');
  const railLinks = [...document.querySelectorAll('#rail a')];
  const chapters = [...document.querySelectorAll('.chapter')];

  const small = window.innerWidth < 700;
  // Quality levels: the page starts high (one step lower on small screens) and steps down by itself if the device
  // can't keep up: fewer drones, a lower pixel ratio, and at the lowest level no halo around each light
  const LEVELS = [{ n: 900, dpr: 2, halo: true }, { n: 520, dpr: 1.5, halo: true }, { n: 340, dpr: 1, halo: false }];
  let level = small ? 1 : 0;
  let COUNT = LEVELS[level].n;
  document.documentElement.dataset.quality = level;
  const WHITE = [255, 255, 255], SKY = [90, 184, 240], HORIZON = [255, 138, 61], GOLD = [255, 196, 110];
  const mix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); return [0, 1, 2].map(i => a[i] + (b[i] - a[i]) * t); };
  const jitter = s => (Math.random() - 0.5) * s;

  let w = 0, h = 0, dpr = 1, mobile = false, short = false;

  // ----- Formations: COUNT points in a unit box (y points down), each with a colour -----
  const evenly = (n, fn) => Array.from({ length: n }, (_, i) => fn(i / n, i));

  function fill(parts) {
    // parts: [[share, generator(t, i)], ...] -> exactly COUNT points
    const pts = [];
    parts.forEach(([share, gen], k) => {
      const n = k === parts.length - 1 ? COUNT - pts.length : Math.round(COUNT * share);
      for (let i = 0; i < n; i++) pts.push(gen(i / n, i));
    });
    return pts;
  }

  // face: the lettering; the logo name uses the brand's Unbounded SemiBold, other words Syncopate
  function text(word, colour, face = { fam: 'Syncopate, "Space Grotesk", sans-serif', weight: 700, track: 0.08 }) {
    const W = 1000, H = 300;
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
    const fam = face.fam;
    const spacing = s => { if ('letterSpacing' in o) o.letterSpacing = (s * face.track).toFixed(1) + 'px'; };
    o.font = `${face.weight} 100px ${fam}`; spacing(100);
    const size = Math.min(230, (100 * 900) / o.measureText(word).width);
    o.font = `${face.weight} ${size.toFixed(1)}px ${fam}`; spacing(size);
    o.fillText(word, W / 2 + ('letterSpacing' in o ? size * face.track / 2 : 0), H / 2);
    const data = o.getImageData(0, 0, W, H).data;
    const inside = (x, y) => data[((y | 0) * W + (x | 0)) * 4 + 3] > 140;
    // Like a real show, drones sit on an even (staggered) grid inside the letters: find the spacing that fits the fleet
    const lattice = step => {
      const pts = [], rowH = step * 0.866;
      for (let y = rowH / 2, row = 0; y < H; y += rowH, row++) {
        for (let x = (row % 2 ? step / 2 : 0) + step / 4; x < W; x += step) if (inside(x, y)) pts.push([x, y]);
      }
      return pts;
    };
    let lo = 1.5, hi = 40;
    for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; if (lattice(mid).length > COUNT) lo = mid; else hi = mid; }
    const grid = lattice(hi);
    if (!grid.length) return constellation();
    // A few spare drones double up on spread-out grid points (they read as one light)
    return Array.from({ length: COUNT }, (_, i) => {
      const [x, y] = i < grid.length ? grid[i] : grid[Math.floor(((i - grid.length) * 0.618034 % 1) * grid.length)];
      const p = { x: (x - W / 2) / 450, y: (y - H / 2) / 450, z: jitter(0.02) };
      p.c = colour(p);
      return p;
    });
  }

  function constellation() {
    // Drones scattered deep and wide, like a field of stars; a few burn brighter
    return evenly(COUNT, (t, i) => {
      const bright = i % 9 === 0;
      const base = mix(WHITE, SKY, Math.random() * 0.6);
      return { x: jitter(3.4), y: jitter(1.9) - 0.1, z: jitter(1.6), c: bright ? WHITE : base.map(v => v * 0.55) };
    });
  }

  function heartXY(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [x / 17, -y / 17 - 0.15];
  }

  function spiral(cx, cy, r0, turns, dir, start) {
    return t => {
      const a = start + dir * t * turns * Math.PI * 2;
      const r = r0 * (1 - t * 0.92);
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
  }

  function sankofa() {
    // Adinkra Sankofa heart: a heart whose top lobes curl inward, with small curls at the base
    const sL = spiral(-0.42, -0.4, 0.3, 1.25, 1, Math.PI);
    const sR = spiral(0.42, -0.4, 0.3, 1.25, -1, 0);
    const bL = spiral(-0.42, 0.72, 0.13, 1, -1, 0);
    const bR = spiral(0.42, 0.72, 0.13, 1, 1, Math.PI);
    const pt = (xy, c) => ({ x: xy[0] + jitter(0.01), y: xy[1] + jitter(0.01), z: jitter(0.05), c });
    return fill([
      [0.5, t => pt(heartXY(t * Math.PI * 2), mix(HORIZON, GOLD, Math.random() * 0.4))],
      [0.18, t => pt(sL(t), mix(WHITE, GOLD, t))],
      [0.18, t => pt(sR(t), mix(WHITE, GOLD, t))],
      [0.07, t => pt(bL(t), SKY)],
      [0.07, t => pt(bR(t), SKY)]
    ]);
  }

  function starPoint(t, ro, ri, rot) {
    const f = t * 10, k = Math.floor(f), u = f - k;
    const corner = j => { const r = j % 2 === 0 ? ro : ri; const a = -Math.PI / 2 + rot + (j * Math.PI) / 5; return [Math.cos(a) * r, Math.sin(a) * r]; };
    const a = corner(k), b = corner((k + 1) % 10);
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  }

  function emblem() {
    // A crest: two rings around a star (a nod to Ghana's Black Star), the shape a brand mark could take
    return fill([
      [0.36, t => { const a = t * Math.PI * 2; return { x: Math.cos(a) * 0.95, y: Math.sin(a) * 0.95, z: jitter(0.04), c: SKY }; }],
      [0.16, t => { const a = t * Math.PI * 2; return { x: Math.cos(a) * 0.84, y: Math.sin(a) * 0.84, z: jitter(0.04), c: mix(SKY, WHITE, 0.5) }; }],
      [0.32, t => { const [x, y] = starPoint(t, 0.62, 0.25, 0); return { x, y, z: jitter(0.04), c: WHITE }; }],
      [0.16, () => { const [x, y] = starPoint(Math.random(), 0.62, 0.25, 0); const s = Math.sqrt(Math.random()) * 0.85; return { x: x * s, y: y * s, z: jitter(0.04), c: GOLD }; }]
    ]);
  }

  function cocoa() {
    // A cocoa pod: pointed ends, ridges running down its length, a stem at the top
    const rot = 0.38, cs = Math.cos(rot), sn = Math.sin(rot);
    const turn = (x, y, c) => ({ x: x * cs - y * sn, y: x * sn + y * cs, z: jitter(0.06), c });
    const pod = s => 0.44 * Math.pow(Math.abs(Math.sin(s)), 1.45);
    return fill([
      [0.46, t => { const s = t * Math.PI * 2; const y = -0.88 * Math.cos(s); return turn(Math.sign(Math.sin(s)) * pod(s), y, mix(GOLD, HORIZON, (y + 0.9) / 1.8)); }],
      [0.42, (t, i) => { const k = [-0.62, -0.25, 0.25, 0.62][i % 4]; const s = 0.08 + t * (Math.PI - 0.16); return turn(k * pod(s), -0.88 * Math.cos(s), mix(HORIZON, GOLD, 0.5)); }],
      [0.12, t => turn(0.02 + t * 0.07, -0.88 - t * 0.2, WHITE)]
    ]);
  }

  function kente() {
    // Woven blocks: stripes alternate horizontal / vertical, like strips of kente cloth sewn together
    const cols = 4, rows = 3, bw = 2.1 / cols, bh = 1.5 / rows, stripes = 3;
    const palette = [HORIZON, GOLD, SKY, WHITE];
    return evenly(COUNT, (t, i) => {
      const block = i % (cols * rows), j = Math.floor(i / (cols * rows));
      const bx = block % cols, by = Math.floor(block / cols);
      const s = j % stripes, along = (j * 0.618034) % 1;
      const x0 = -1.05 + bx * bw, y0 = -0.75 + by * bh;
      const across = (s + 0.5) / stripes;
      const horiz = (bx + by) % 2 === 0;
      const x = x0 + (horiz ? along : across) * bw * 0.9 + bw * 0.05;
      const y = y0 + (horiz ? across : along) * bh * 0.9 + bh * 0.05;
      return { x, y, z: jitter(0.04), c: palette[(s + bx + by) % 4] };
    });
  }

  function sunrise() {
    // A sun of light with rays all around: the end of the night, the start of a story
    return fill([
      [0.5, () => { const a = Math.random() * 6.2832; const r = Math.sqrt(Math.random()) * 0.5; return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: jitter(0.05), c: mix(WHITE, HORIZON, r / 0.5) }; }],
      [0.5, (t, i) => { const k = i % 16; const a = (k / 16) * 6.2832; const r = 0.64 + ((i * 0.618034) % 1) * 0.36; return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: jitter(0.05), c: mix(GOLD, WHITE, (r - 0.64) / 0.36) }; }]
    ]);
  }

  function orion() {
    // Orion, the hunter: a constellation every culture has a story for. Stars are bright clusters, lines are dimmer drones.
    const S = {
      meissa: [-0.02, -0.78], betelgeuse: [-0.45, -0.55], bellatrix: [0.35, -0.42],
      alnitak: [-0.18, 0.2], alnilam: [-0.02, 0.15], mintaka: [0.14, 0.1],
      saiph: [-0.32, 0.92], rigel: [0.42, 0.8],
      sw1: [-0.06, 0.42], sw2: [-0.05, 0.52], sw3: [-0.04, 0.62],
      c1: [-0.62, -0.75], c2: [-0.52, -0.98], s1: [0.62, -0.5], s2: [0.78, -0.3], s3: [0.82, -0.1], s4: [0.76, 0.1]
    };
    const bright = [['betelgeuse', [255, 150, 90], 3], ['rigel', [170, 210, 255], 3], ['bellatrix', WHITE, 2], ['saiph', WHITE, 2],
      ['alnitak', WHITE, 2], ['alnilam', WHITE, 2], ['mintaka', WHITE, 2], ['meissa', WHITE, 1], ['sw2', [200, 170, 255], 1]];
    const lines = [['meissa', 'betelgeuse'], ['meissa', 'bellatrix'], ['betelgeuse', 'bellatrix'], ['betelgeuse', 'alnitak'], ['bellatrix', 'mintaka'],
      ['alnitak', 'alnilam'], ['alnilam', 'mintaka'], ['alnitak', 'saiph'], ['mintaka', 'rigel'], ['sw1', 'sw3'],
      ['betelgeuse', 'c1'], ['c1', 'c2'], ['bellatrix', 's1'], ['s1', 's2'], ['s2', 's3'], ['s3', 's4']];
    const weighted = bright.flatMap(b => Array(b[2]).fill(b));
    return fill([
      [0.42, (t, i) => { const [name, c] = weighted[i % weighted.length]; const a = Math.random() * 6.2832, r = Math.sqrt(Math.random()) * 0.035; return { x: S[name][0] + Math.cos(a) * r, y: S[name][1] + Math.sin(a) * r, z: jitter(0.05), c }; }],
      [0.58, (t, i) => { const [a, b] = lines[i % lines.length]; const u = (Math.floor(i / lines.length) * 0.618034) % 1; return { x: S[a][0] + (S[b][0] - S[a][0]) * u, y: S[a][1] + (S[b][1] - S[a][1]) * u, z: jitter(0.05), c: mix(SKY, WHITE, 0.4).map(v => v * 0.75) }; }]
    ]);
  }

  const builders = {
    palsky: () => text('palsky', p => mix(WHITE, GOLD, (p.y + 0.12) / 0.3), { fam: 'Unbounded, Syncopate, sans-serif', weight: 600, track: 0.01 }),
    orion,
    sankofa, emblem, cocoa, kente, sunrise
  };
  // "Welcome" in many languages, starting at home in Ghana; the people chapter cycles through them
  const WELCOMES = [
    ['AKWAABA', 'Akwaaba · Twi'], ['KARIBU', 'Karibu · Swahili'], ['BIENVENUE', 'Bienvenue · French'],
    ['BIENVENIDOS', 'Bienvenidos · Spanish'], ['WILLKOMMEN', 'Willkommen · German'], ['WELCOME', 'Welcome · English']
  ];
  // Welcome words in the brand's headline face, Bricolage Grotesque ExtraBold: thick strokes hold enough drones to read clearly
  WELCOMES.forEach(([word], i) => { builders['welcome' + i] = () => text(word, p => mix(HORIZON, WHITE, (p.x + 1) / 2), { fam: '"Bricolage Grotesque", Syncopate, sans-serif', weight: 800, track: 0.03 }); });
  const cache = {};
  // Every point is checked once, so a bad value can never send a drone off the map
  const clean = pts => pts.map(p => (Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) ? p : { x: 0, y: 0, z: 0, c: p.c || WHITE }));
  const formation = key => cache[key] || (cache[key] = clean(builders[key]()));

  // Chapters whose formation changes on its own: [formation, label] steps and how long each holds
  const sequences = { welcome: { hold: 7000, steps: WELCOMES.map(([, l], i) => ['welcome' + i, l]) } };

  // The PALSKY logo mark, from the brand identity: drone lights draw a P (for People) over a kente weave.
  // Coordinates are the mark's own 300 x 300 grid; strips are [x, y, w, h, colour] in Ghana's kente green, gold and red.
  const LOGO_DOTS = [[83.3,50],[116.7,50],[150,50],[183.3,50],[83.3,83.3],[216.7,83.3],[83.3,116.7],[216.7,116.7],[83.3,150],[116.7,150],[150,150],[183.3,150],[83.3,183.3],[83.3,216.7],[83.3,250]];
  const LOGO_STRIPS = [[6.7,13.7,20,6,0],[47,6.7,6,20,1],[73.3,13.7,20,6,2],[113.7,6.7,6,20,1],[140,13.7,20,6,0],[180.3,6.7,6,20,1],[206.7,13.7,20,6,2],[247,6.7,6,20,1],[273.3,13.7,20,6,0],[13.7,40,6,20,1],[40,47,20,6,2],[213.7,40,6,20,1],[240,47,20,6,0],[280.3,40,6,20,0],[6.7,80.3,20,6,2],[47,73.3,6,20,1],[113.7,73.3,6,20,1],[140,80.3,20,6,0],[180.3,73.3,6,20,0],[247,73.3,6,20,0],[273.3,80.3,20,6,1],[13.7,106.7,6,20,2],[40,113.7,20,6,1],[106.7,113.7,20,6,2],[147,106.7,6,20,1],[173.3,113.7,20,6,0],[240,113.7,20,6,0],[280.3,106.7,6,20,1],[6.7,147,20,6,0],[47,140,6,20,0],[206.7,147,20,6,1],[247,140,6,20,2],[273.3,147,20,6,1],[13.7,173.3,6,20,1],[40,180.3,20,6,2],[106.7,180.3,20,6,0],[147,173.3,6,20,0],[173.3,180.3,20,6,1],[213.7,173.3,6,20,1],[240,180.3,20,6,0],[280.3,173.3,6,20,0],[6.7,213.7,20,6,2],[47,206.7,6,20,1],[113.7,206.7,6,20,2],[140,213.7,20,6,1],[180.3,206.7,6,20,0],[206.7,213.7,20,6,1],[247,206.7,6,20,0],[273.3,213.7,20,6,1],[13.7,240,6,20,1],[40,247,20,6,0],[106.7,247,20,6,0],[147,240,6,20,0],[173.3,247,20,6,1],[213.7,240,6,20,0],[240,247,20,6,1],[280.3,240,6,20,2],[6.7,280.3,20,6,0],[47,273.3,6,20,0],[73.3,280.3,20,6,1],[113.7,273.3,6,20,1],[140,280.3,20,6,2],[180.3,273.3,6,20,1],[206.7,280.3,20,6,1],[247,273.3,6,20,2],[273.3,280.3,20,6,1]];
  const KENTE = [[0, 150, 90], [252, 209, 22], [230, 40, 60]];
  function logo() {
    const u = v => (v - 150) / 150;
    return fill([
      // Each light of the P is a tight cluster of drones, so it reads as one bright point
      [0.45, (t, i) => {
        const [x, y] = LOGO_DOTS[i % LOGO_DOTS.length];
        const a = Math.random() * 6.2832, r = Math.sqrt(Math.random()) * 7;
        return { x: u(x + Math.cos(a) * r), y: u(y + Math.sin(a) * r), z: jitter(0.03), c: WHITE };
      }],
      // The weave behind it: drones spaced along each strip, dimmer so the P stays in front
      [0.55, (t, i) => {
        const [x, y, w2, h2, k] = LOGO_STRIPS[i % LOGO_STRIPS.length];
        const along = ((Math.floor(i / LOGO_STRIPS.length) * 0.618034) % 1);
        const px = w2 > h2 ? x + along * w2 : x + w2 / 2, py = w2 > h2 ? y + h2 / 2 : y + along * h2;
        return { x: u(px), y: u(py), z: jitter(0.03), c: KENTE[k].map(v => v * 0.72) };
      }]
    ]);
  }
  builders.logo = logo;
  // The opening scene alternates the wordmark and the logo mark
  sequences.palsky = { hold: 7600, steps: [['palsky', 'PALSKY'], ['logo', 'PALSKY logo mark']] };

  // ----- Where the formation sits on screen for each chapter -----
  // The closing sun fits itself into the free sky between the contact links and the footer
  const dawnCopy = document.querySelector('#dawn .copy'), dawnFooter = document.querySelector('#dawn footer.end');
  const heroFirst = document.querySelector('#hero .copy > :first-child');
  // Page positions are measured once (on load, resize and when the layout changes), never while animating or scrolling
  function pageTop(el) { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; }
  function pageLeft(el) { let x = 0; for (let n = el; n; n = n.offsetParent) x += n.offsetLeft; return x; }
  let geo = null;
  function measure() {
    geo = {
      bar: bar.offsetHeight,
      heroFirst: pageTop(heroFirst),
      chapters: chapters.map(s => {
        const c = s.querySelector('.copy');
        return { top: pageTop(s), copy: { left: pageLeft(c), right: pageLeft(c) + c.offsetWidth, top: pageTop(c), bottom: pageTop(c) + c.offsetHeight } };
      }),
      dawnCopyBottom: pageTop(dawnCopy) + dawnCopy.offsetHeight,
      footerTop: pageTop(dawnFooter), footerBottom: pageTop(dawnFooter) + dawnFooter.offsetHeight
    };
  }
  function sunAnchor() {
    if (short) return { x: w * 0.78, y: h * 0.56, r: Math.min(w * 0.13, h * 0.3) };
    const sy = window.scrollY;
    const top = Math.max(geo.dawnCopyBottom - sy, mobile ? geo.footerBottom - sy : 0, h * 0.3) + 18;
    const bottom = (mobile ? h : Math.min(h, geo.footerTop - sy)) - 14;
    const r = Math.max(36, Math.min((bottom - top) / 2.1, w * 0.16, h * 0.17));
    return { x: w * 0.5, y: Math.max(top + r * 1.02, bottom - r * 1.02), r };
  }

  // The opening's wordmark and logo fit themselves into the free sky between the top bar and the opening text,
  // measured from the page layout (ignoring reveal animations), so they never overlap the badge or headline
  const extents = {};
  function extent(key) {
    if (!extents[key]) {
      const pts = formation(key);
      extents[key] = pts.reduce((e, p) => ({ x0: Math.min(e.x0, p.x), x1: Math.max(e.x1, p.x), y0: Math.min(e.y0, p.y), y1: Math.max(e.y1, p.y) }), { x0: 1, x1: -1, y0: 1, y1: -1 });
    }
    return extents[key];
  }
  function heroAnchor(key) {
    const e = extent(key), margin = Math.max(14, h * 0.025);
    const top = geo.bar + margin, bottom = geo.heroFirst - margin;
    const maxR = key === 'logo' ? (mobile ? Math.min(w * 0.3, h * 0.17) : Math.min(w * 0.2, h * 0.2)) : (mobile ? w * 0.43 : Math.min(w * 0.3, h * 0.5));
    const r = Math.max(24, Math.min(maxR, (bottom - top) / (e.y1 - e.y0), (w * 0.92) / (e.x1 - e.x0)));
    // centre the shape in the free band (top of the shape at e.y0 * r from the anchor)
    const y = top + Math.max(0, (bottom - top) - r * (e.y1 - e.y0)) / 2 - r * e.y0;
    return { x: w * 0.5, y, r };
  }

  function anchorFor(section, current) {
    const key = current.startsWith('welcome') ? 'welcome' : current, side = section.dataset.side;
    if (key === 'sunrise') return sunAnchor();
    if (!short && (key === 'palsky' || key === 'logo')) return heroAnchor(key);
    if (short) {
      // Story on one side, drones in the other half; the opening's text sits on the right
      const r = key === 'palsky' || key === 'welcome' ? Math.min(w * 0.2, h * 0.55) : key === 'logo' ? Math.min(w * 0.13, h * 0.3) : Math.min(w * 0.17, h * 0.34);
      return { x: side === 'left' ? w * 0.75 : w * 0.24, y: h * 0.56, r };
    }
    if (mobile) {
      if (key === 'welcome') return { x: w * 0.5, y: h * 0.2, r: w * 0.48 };
      return { x: w * 0.5, y: h * 0.27, r: Math.min(w * 0.4, h * 0.2) };
    }
    const r = Math.min(w * 0.22, h * 0.32);
    if (side === 'left') return { x: w * 0.71, y: h * 0.48, r };
    if (side === 'right') return { x: w * 0.29, y: h * 0.48, r };
    return { x: w * 0.5, y: h * 0.45, r };
  }

  // ----- The night sky: a pre-rendered star field and Milky Way, twinkling stars, real constellations -----
  let field = null, twinklers = [], shooting = null, nextShoot = 4000;
  // Constellation shapes (unit box, y down) placed around the sky as faint line drawings
  const CONSTELLATIONS = [
    { at: [0.05, 0.1], size: 0.2, stars: [[0, 0.25], [0.18, 0.2], [0.33, 0.27], [0.47, 0.33], [0.52, 0.55], [0.75, 0.6], [0.78, 0.38]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] }, // Big Dipper
    { at: [0.74, 0.08], size: 0.15, stars: [[0, 0.3], [0.22, 0.55], [0.42, 0.38], [0.62, 0.6], [0.85, 0.25]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },                                  // Cassiopeia
    { at: [0.86, 0.6], size: 0.09, stars: [[0.5, 0], [0.47, 0.85], [0.18, 0.42], [0.78, 0.36], [0.62, 0.55]], lines: [[0, 1], [2, 3]] },                                             // Southern Cross
    { at: [0.12, 0.66], size: 0.05, stars: [[0.2, 0.3], [0.45, 0.2], [0.55, 0.45], [0.35, 0.55], [0.75, 0.35], [0.6, 0.7], [0.9, 0.55]], lines: [] }                                  // Pleiades
  ];

  function buildField() {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    field = document.createElement('canvas');
    field.width = Math.round(w * dpr); field.height = Math.round(h * dpr);
    const f = field.getContext('2d');
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Deep night, a touch of blue low in the sky
    const g = f.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#010208'); g.addColorStop(0.6, '#03050f'); g.addColorStop(1, '#070b1c');
    f.fillStyle = g; f.fillRect(0, 0, w, h);
    // The Milky Way: a soft diagonal band of haze, densest in the middle
    const band = (t, off) => [w * (-0.1 + t * 1.2), h * (0.95 - t * 0.9) + off];
    // The haze is painted at a quarter of the resolution and scaled up: it is a soft blur, so it looks the same
    const q = 0.25, haze = document.createElement('canvas');
    haze.width = Math.max(1, Math.round(w * q)); haze.height = Math.max(1, Math.round(h * q));
    const hz = haze.getContext('2d'); hz.setTransform(q, 0, 0, q, 0, 0);
    for (let i = 0; i < 70; i++) {
      const [x, y] = band(rnd(), (rnd() - 0.5) * h * 0.16);
      const r = Math.max(w, h) * (0.05 + rnd() * 0.09);
      const blob = hz.createRadialGradient(x, y, 0, x, y, r);
      blob.addColorStop(0, `rgba(${150 + rnd() * 40 | 0},${160 + rnd() * 40 | 0},220,${0.018 + rnd() * 0.02})`);
      blob.addColorStop(1, 'rgba(150,160,220,0)');
      hz.fillStyle = blob; hz.fillRect(x - r, y - r, r * 2, r * 2);
    }
    f.imageSmoothingQuality = 'high';
    f.drawImage(haze, 0, 0, w, h);
    // Thousands of faint stars, crowded into the band, with real star colours (blue-white to warm)
    const tint = () => { const k = rnd(); return k < 0.15 ? '255,214,170' : k < 0.35 ? '200,220,255' : '255,255,255'; };
    const n = Math.round((w * h) / (small ? 260 : 380));
    for (let i = 0; i < n; i++) {
      const inBand = rnd() < 0.45;
      const [x, y] = inBand ? band(rnd(), (rnd() - 0.5) * h * 0.22) : [rnd() * w, rnd() * h];
      const a = 0.15 + Math.pow(rnd(), 3) * 0.75;
      f.fillStyle = `rgba(${tint()},${a.toFixed(2)})`;
      const r = rnd() < 0.03 ? 1.3 : 0.7;
      f.fillRect(x, y, r, r);
    }
    // Constellations: faint lines, brighter stars
    const span = Math.min(w, h * 1.4);
    f.lineWidth = 0.7; f.strokeStyle = 'rgba(160,190,255,0.16)';
    twinklers = [];
    CONSTELLATIONS.forEach(c => {
      const pt = ([x, y]) => [c.at[0] * w + x * c.size * span * (small ? 1.6 : 1), c.at[1] * h + y * c.size * span * (small ? 1.6 : 1)];
      c.lines.forEach(([i, j]) => { const [x1, y1] = pt(c.stars[i]), [x2, y2] = pt(c.stars[j]); f.beginPath(); f.moveTo(x1, y1); f.lineTo(x2, y2); f.stroke(); });
      c.stars.forEach(st => { const [x, y] = pt(st); twinklers.push({ x, y, r: c.lines.length ? 1.5 : 1.1, ph: rnd() * 6.28, sp: 0.8 + rnd(), c: '235,240,255' }); });
    });
    // A scatter of brighter stars that twinkle
    for (let i = 0; i < (small ? 70 : 140); i++) twinklers.push({ x: rnd() * w, y: rnd() * h, r: 0.8 + rnd() * 1, ph: rnd() * 6.28, sp: 0.6 + rnd() * 2, c: tint() });
  }

  // ----- Drones -----
  // Flown the way a real show is: every drone travels on a timed, near-straight path, easing out of its spot and into the
  // next, and the whole fleet arrives together. Take-off is a slow vertical climb. Lights stay steady; colours fade in flight.
  const FLIGHT = 3600, LIFTOFF = 5600;   // ms
  let drones = [], active = null, anchor = { x: 0, y: 0, r: 1 }, goal = anchor, clock = 0, arriveBy = 0;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // smooth start, smooth stop

  function launch() {
    drones = Array.from({ length: COUNT }, () => ({
      x: 0, y: 0, z: 0, sx: 0, sy: 0, sz: 0,
      t0: 0, dur: LIFTOFF, bow: 0, lift: true,
      phase: Math.random() * 6.28, phase2: Math.random() * 6.28,
      c: [255, 255, 255], sc: [255, 255, 255], t: null, tc: WHITE
    }));
  }

  let currentKey = '', step = 0, stepAt = 0, lowest = 1;
  function fly(key, text) {
    currentKey = key;
    const pts = formation(key);
    lowest = pts.reduce((m, p) => Math.max(m, p.y), -1);
    goal = anchorFor(active, key);
    drones.forEach((d, i) => {
      d.t = pts[i]; d.tc = pts[i].c;
      if (d.lift && !d.t0) {
        // First flight: start on the ground below the screen, right under the drone's place in the formation
        const tx = goal.x + d.t.x * goal.r;
        d.sx = tx + jitter(goal.r * 0.25); d.sy = h + 30 + Math.random() * 60; d.sz = 0;
        d.t0 = clock + 250 + Math.random() * 1400;   // lift off in loose waves
        d.dur = LIFTOFF + Math.random() * 600;
      } else {
        d.sx = d.x; d.sy = d.y; d.sz = d.z;
        d.t0 = clock + Math.random() * 220;            // all leave within a moment of each other
        d.dur = FLIGHT + Math.random() * 400;
      }
      d.sc = d.c.slice();
      d.bow = (Math.random() - 0.5) * 0.16;          // a slight bend, so paths don't cut through each other
      d.lift = false;
    });
    arriveBy = drones.reduce((m, d) => Math.max(m, d.t0 + d.dur), 0);
    if (label.textContent !== text) { label.textContent = text; captionSize = null; }
  }

  function nextStep(seq) {
    step = (step + 1) % seq.steps.length;
    fly(...seq.steps[step]);
  }

  function setChapter(section) {
    if (section === active) return;
    active = section;
    const seq = sequences[section.dataset.formation];
    step = 0; stepAt = performance.now();
    if (seq) fly(...seq.steps[0]); else fly(section.dataset.formation, section.dataset.label);
    railLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + section.id));
    if (reduceMotion) { anchor = goal; snap(); draw(0); }
  }

  function pickChapter() {
    const mid = window.scrollY + h * 0.5;
    let current = chapters[0];
    geo.chapters.forEach((c, i) => { if (c.top <= mid) current = chapters[i]; });
    setChapter(current);
  }

  function resize(force) {
    const nw = window.innerWidth, nh = window.innerHeight;
    // Phones change height a little when the address bar slides while scrolling; the sky stretches to cover that instead of rebuilding
    if (!force && field && nw === w && Math.abs(nh - h) < 120) return;
    dpr = Math.min(window.devicePixelRatio || 1, LEVELS[level].dpr);
    w = nw; h = nh;
    short = h < 500 && w > h;          // a phone held sideways: side-by-side layout
    mobile = w < 900 && !short;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildField();
    measure();
    if (active) { goal = anchorFor(active, currentKey); if (reduceMotion) { anchor = goal; snap(); draw(0); } }
  }

  function screenTarget(d, sway) {
    const cs = Math.cos(sway), sn = Math.sin(sway);
    const x = d.t.x * cs + d.t.z * sn, z = -d.t.x * sn + d.t.z * cs;
    const persp = 3 / (3 + z);
    return [anchor.x + x * anchor.r * persp, anchor.y + d.t.y * anchor.r * persp, z, persp];
  }

  function snap() {
    drones.forEach(d => { const [x, y, z] = screenTarget(d, 0); d.x = d.sx = x; d.y = d.sy = y; d.z = d.sz = z; d.c = d.tc.slice(); d.sc = d.tc.slice(); d.t0 = 0; d.dur = 1; d.lift = false; });
    arriveBy = 0;
  }

  function drawSky(time) {
    ctx.drawImage(field, 0, 0, w, h);
    for (const s of twinklers) {
      const a = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(time * 0.001 * s.sp + s.ph), 2);
      ctx.fillStyle = `rgba(${s.c},${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.6, 0, 6.2832); ctx.fill();
    }
    // An occasional shooting star
    if (!reduceMotion) {
      if (!shooting && time > nextShoot) {
        shooting = { x: Math.random() * w * 0.8 + w * 0.1, y: Math.random() * h * 0.35, vx: -(5 + Math.random() * 5), vy: 2.5 + Math.random() * 2.5, life: 1 };
        nextShoot = time + 6000 + Math.random() * 9000;
      }
      if (shooting) {
        const s = shooting;
        const tail = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 16, s.y - s.vy * 16);
        tail.addColorStop(0, `rgba(255,255,255,${s.life})`); tail.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = tail; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 16, s.y - s.vy * 16); ctx.stroke();
        s.x += s.vx; s.y += s.vy; s.life -= 0.02;
        if (s.life <= 0) shooting = null;
      }
    }
  }

  function drawDrones(time, dt) {
    anchor = {
      x: anchor.x + (goal.x - anchor.x) * 0.035,
      y: anchor.y + (goal.y - anchor.y) * 0.035,
      r: anchor.r + (goal.r - anchor.r) * 0.035
    };
    // A slow, gentle turn so 3D shapes show their depth; flat shapes barely move
    const sway = Math.sin(time * 0.00018) * 0.12 + (currentKey === 'orion' ? Math.sin(time * 0.0001) * 0.12 : 0);
    const halo = LEVELS[level].halo;
    ctx.globalCompositeOperation = 'lighter';
    for (const d of drones) {
      if (!d.t) continue;
      const [tx, ty, tz, persp] = screenTarget(d, sway);
      const p = Math.max(0, Math.min(1, (time - d.t0) / d.dur));
      const e = ease(p);
      // Straight line from where the drone was to where it is going, bent slightly sideways mid-flight
      const dx = tx - d.sx, dy = ty - d.sy, bend = Math.sin(Math.PI * e) * d.bow;
      d.x = d.sx + dx * e - dy * bend;
      d.y = d.sy + dy * e + dx * bend;
      d.z = d.sz + (tz - d.sz) * e;
      for (let c = 0; c < 3; c++) d.c[c] = d.sc[c] + (d.tc[c] - d.sc[c]) * e;
      if (p < 0.001 && d.sy > h) continue;   // still on the ground, out of sight
      // Holding position: the faint wander of a real drone in the air
      const x = d.x + Math.sin(time * 0.0011 + d.phase) * 0.7 + Math.sin(time * 0.0027 + d.phase2) * 0.3;
      const y = d.y + Math.cos(time * 0.0009 + d.phase2) * 0.7;
      const glow = 0.92 + 0.08 * Math.sin(time * 0.0016 - (tx + ty) * 0.01);
      const size = Math.max(0.8, 1.75 * persp * (mobile ? 0.85 : 1));
      const r = Math.min(255, d.c[0] * glow) | 0, g = Math.min(255, d.c[1] * glow) | 0, b = Math.min(255, d.c[2] * glow) | 0;
      if (halo) {
        ctx.fillStyle = `rgba(${r},${g},${b},0.14)`;
        ctx.beginPath(); ctx.arc(x, y, size * 3.4, 0, 6.2832); ctx.fill();   // a tighter halo keeps neighbouring lights distinct
      }
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath(); ctx.arc(x, y, size, 0, 6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // The caption sits just under the formation, on the side of the screen that has no text
  let captionSize = null, captionOn = false, captionAt = '';
  function placeCaption() {
    // Hidden while the formation glides between chapters, so it never sweeps across the story text
    const settled = clock > arriveBy && Math.abs(goal.x - anchor.x) < 12 && Math.abs(goal.y - anchor.y) < 12;
    let show = !mobile && !short && settled && active && active.dataset.side !== 'center';
    if (show) {
      if (!captionSize) captionSize = { w: caption.offsetWidth, h: caption.offsetHeight };   // measured once per label
      const left = anchor.x - captionSize.w / 2, top = anchor.y + lowest * anchor.r + 34;
      // Never let the label touch the story text: on tight screens it simply stays hidden
      const t = geo.chapters[chapters.indexOf(active)].copy, sy = window.scrollY;
      const clash = left < t.right + 12 && t.left - 12 < left + captionSize.w && top < t.bottom - sy && t.top - sy < top + captionSize.h;
      if (clash || top + captionSize.h > h - 8) show = false;
      const at = `translate(${anchor.x.toFixed(0)}px, ${top.toFixed(0)}px) translateX(-50%)`;
      if (show && at !== captionAt) { caption.style.transform = at; captionAt = at; }
    }
    if (show !== captionOn) { caption.classList.toggle('on', show); captionOn = show; }
  }

  let last = 0;
  function draw(time) {
    const dt = Math.min(50, time - last || 16.7); last = time; clock = time;
    drawSky(time);
    drawDrones(time, dt);
    placeCaption();
  }

  function applyLevel() {
    // Step down one quality level: rebuild the shapes for the smaller fleet and glide the remaining drones into them
    COUNT = LEVELS[level].n;
    document.documentElement.dataset.quality = level;
    for (const k in cache) delete cache[k];
    for (const k in extents) delete extents[k];
    drones.length = Math.min(drones.length, COUNT);
    resize(true);
    if (active) fly(currentKey, label.textContent);
    prebuild();
  }

  // Build the shapes not yet needed while the browser is idle, one at a time
  const idle = window.requestIdleCallback || (f => setTimeout(f, 60));
  function prebuild() {
    const todo = Object.keys(builders).filter(k => !cache[k]);
    (function next() { const k = todo.shift(); if (k) idle(() => { if (!cache[k]) formation(k); next(); }); })();
  }

  // Once the brand typefaces arrive, rebuild the lettered shapes with the right letter forms; if one is in the sky,
  // the drones glide to their new places
  function reletter() {
    const lettered = k => k === 'palsky' || k.startsWith('welcome');
    for (const k in cache) if (lettered(k)) delete cache[k];
    for (const k in extents) if (lettered(k)) delete extents[k];
    measure();                       // the fonts may have changed the page layout
    if (!active || !lettered(currentKey)) return;
    if (clock < arriveBy) {          // still flying (e.g. lifting off): just aim at the new points
      const pts = formation(currentKey);
      lowest = pts.reduce((m, p) => Math.max(m, p.y), -1);
      goal = anchorFor(active, currentKey);
      drones.forEach((d, i) => { d.t = pts[i]; d.tc = pts[i].c; });
      if (reduceMotion) { anchor = goal; snap(); draw(0); }
    } else {
      fly(currentKey, label.textContent);
      if (reduceMotion) { anchor = goal; snap(); draw(0); }
    }
  }

  function start() {
    resize();
    launch();
    window.addEventListener('resize', () => resize());
    // Layout can change after load (fonts swapping in, reveal of content): re-measure, never during scrolling
    if (window.ResizeObserver) new ResizeObserver(() => { measure(); if (active) goal = anchorFor(active, currentKey); }).observe(document.querySelector('main'));
    const onScroll = () => {
      pickChapter();
      if (currentKey === 'sunrise') goal = sunAnchor();   // the free space moves as the closing copy scrolls
      bar.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // Start-up runs as short tasks so the page stays responsive: the sky is ready now; the first chapter's shape
    // is fitted in the next task, and the animation runs on the browser's own frame schedule
    const begin = () => { pickChapter(); anchor = goal; onScroll(); };
    if (reduceMotion) {
      setTimeout(() => { begin(); snap(); draw(0); }, 0);
      window.addEventListener('scroll', () => draw(0), { passive: true });
      return;
    }
    setTimeout(begin, 0);
    const t0 = performance.now();
    let prev = 0, lastDraw = 0, frames = 0, slowSum = 0, changedAt = 0;
    function loop(now) {
      requestAnimationFrame(loop);
      // Watch how fast frames arrive (90-frame windows, after the first 1.5 s): if the device can't keep up, step down
      const gap = now - prev; prev = now;
      if (now - t0 > 1500 && gap > 0 && gap < 250 && level < LEVELS.length - 1 && now - changedAt > 2000) {
        frames++; slowSum += gap;
        if (frames >= 90) {
          if (slowSum / frames > 24) { level++; changedAt = now; applyLevel(); }
          frames = 0; slowSum = 0;
        }
      }
      // Small screens draw at 30 frames a second: half the work, still smooth for slow-moving drones
      if (small && now - lastDraw < 30) return;
      lastDraw = now;
      const seq = active && sequences[active.dataset.formation];
      // Move on only after the hold time AND once every drone has arrived and the shape has been seen for a moment
      if (seq && now - stepAt > seq.hold && clock > arriveBy + 2500) { stepAt = now; nextStep(seq); }
      draw(now - t0);
    }
    requestAnimationFrame(loop);
  }

  // Start straight away: the sky never waits for fonts. The first shape uses whatever font is ready and is re-lettered
  // the moment the brand typefaces load; the other shapes are built while the browser is idle.
  start();
  prebuild();
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('700 100px Syncopate'), document.fonts.load('600 100px Unbounded'), document.fonts.load('800 100px "Bricolage Grotesque"')])
      .then(reletter, () => {});
  }
})();
