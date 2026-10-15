---
version: "alpha"
name: "mymined"
description: "A white sun in an orange-pink-lilac halo, giant book-serif headlines, outlined candy chips, pastel bento cards and thought-bubble testimonials. Calm, private, a little precious."
colors:
  primary: "#ff5924"
  on-primary: "#ffffff"
  surface: "#ffffff"
  surface-container: "#f6f4f2"
  on-surface: "#0d0d10"
  on-surface-variant: "#4a5465"
  outline: "#e4e8ec"
  fg-faint: "#748297"
  sand: "#f3f0e7"
  mist: "#e5eaf2"
  sage: "#dde9d3"
  rose: "#f4ecef"
  blush: "#fff1f1"
  seafoam: "#ccddd8"
  lilac: "#9b97e6"
  tag-orange: "#e98f53"
  tag-pink: "#e48abf"
  tag-blue: "#99d2fb"
  tag-red: "#ea726b"
  tag-yellow: "#ffcf27"
  live: "#5bbf4a"
  marker: "#fff2a6"
typography:
  headline-display:
    fontFamily: "EB Garamond"
    fontSize: 140px
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: -0.06em
  headline-lg:
    fontFamily: "EB Garamond"
    fontSize: 96px
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: -0.05em
  title-md:
    fontFamily: "Inter"
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.03em
  body-md:
    fontFamily: "Inter"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
  label-md:
    fontFamily: "Nunito"
    fontSize: 14px
    fontWeight: 700
    letterSpacing: 0.14em
rounded:
  sm: 12px
  md: 16px
  lg: 20px
  bubble: 40px
  full: 9999px
spacing:
  unit: 4px
  section: 128px
  max-width: 1180px
---

# mymined

> A private keep-everything app sold like a meditation retreat: a white sun breaking through an orange, pink and lilac halo, book-serif headlines the size of a billboard, and candy-coloured outlined chips.

Source: https://flavors.design/f/mymined

## Overview

mymined is the calm-tech landing page: a product that wants to take things off your plate, so the page takes things off the page. The hero is one enormous white disc with a blurred conic halo bleeding orange at the left, red-pink and lilac at the right, and a two-line serif headline cut with tight negative tracking. Everything below alternates between plain white air, a warm off-white (`#f6f4f2`), one saturated orange band, and a white sheet floating on an orange-to-blush gradient that holds pastel bento cards. The serif carries all the emotion (manifesto paragraphs, a list of orange **NO**s, italic "Welcome to…"), Inter does the explaining, and a rounded Nunito handles chips, eyebrows and anything you tap.

It is for consumer apps that sell peace, privacy and taste: notes, bookmarks, journals, a reading app. It is NOT a SaaS dashboard pitch, NOT neon-gradient AI, and NOT minimal-brutalist; there are no grids of logos, no hard shadows, no dark mode by default. The product is shown as soft CSS mock-ups (blurred canvases, floating paper cards, a highlighted sentence with a context menu), never as a dense screenshot. The emotion is relief.

## Colors

| Role       | Value     | Notes                                                   |
| ---------- | --------- | ------------------------------------------------------- |
| bg         | `#ffffff` | page, the sun disc, cards on pastel, bubbles            |
| bg-2       | `#f6f4f2` | warm off-white section band ("it just works")           |
| fg         | `#0d0d10` | serif headlines, near-black ink                         |
| fg-muted   | `#4a5465` | Inter body copy, slate-blue grey                        |
| fg-faint   | `#748297` | captions, inactive tabs, footer links                   |
| accent     | `#ff5924` | the one orange: buttons, eyebrows, NO list, one band    |
| accent-fg  | `#ffffff` | text on orange, the italic welcome line, trust headline |
| border     | `#e4e8ec` | hairlines between cells, FAQ rules, card outlines       |
| sand       | `#f3f0e7` | bento card                                              |
| mist       | `#e5eaf2` | bento card, the app canvas                              |
| sage       | `#dde9d3` | bento card                                              |
| rose       | `#f4ecef` | bento card                                              |
| blush      | `#fff1f1` | pink paper behind testimonials, use cases, the arc      |
| seafoam    | `#ccddd8` | the moodboard card                                      |
| lilac      | `#9b97e6` | halo, footer motto, footer wash                         |
| tag-orange | `#e98f53` | chip stroke + text                                      |
| tag-pink   | `#e48abf` | chip, halo, nav dot                                     |
| tag-blue   | `#99d2fb` | chip                                                    |
| tag-red    | `#ea726b` | chip, halo, collection ring                             |
| tag-yellow | `#ffcf27` | chip, nav dot, clock hand                               |
| live       | `#5bbf4a` | the green dot before "Log in" and on the status line    |
| marker     | `#fff2a6` | highlighter behind a kept sentence                      |

Scheme: light. Contrast rule: body text is `fg-muted` on white (7.6:1); faint captions stay ≥ 4:1. Color rules: orange is the only saturated fill and appears as small pills plus one full-bleed band; pastels never sit next to each other without white between them; chip colours are strokes at full strength with a 6% top-down tint, never solid fills.

## Typography

- Display: `"EB Garamond", Georgia, serif` (a Garamond stand-in for the site's commercial book serif) — weight 400 for headlines, 600 only for an inline **We promise:**, italic for "Welcome to…" and for a second-line emphasis; tracking `-0.05em` (hero `-0.06em`), line-height 0.86–0.95, sentence case
- Body: `"Inter", system-ui, sans-serif` — 18px / 1.65, subheads 20px / 1.55 at `-0.02em`; card titles Inter Medium 30px at `-0.03em`
- UI: `"Nunito", system-ui, sans-serif` — chips 600 18px, eyebrows 700 14px uppercase at `0.14em`, wordmark 800 20px, the orange **NO** 800
- Scale: 13 / 15 / 18 / 20 / 30 / 42 / 64 / 96 / 140
- Load: `<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500&family=Nunito:wght@600;700;800&display=swap">`
- Rules: serif headlines wrap to 2–3 balanced lines (`max-width: 12.5em`, `text-wrap: balance`); the manifesto opens with an italic drop-word; labels are the only uppercase

## Layout

- Max width 1180px for text, 1370px for the floating white sheet; gutters 24px, sheet inset 26px from the viewport
- Base unit 4px; spacing scale 4 / 8 / 12 / 16 / 24 / 40 / 72 / 128
- Section rhythm 128px; the welcome glow gets 220px above it so the orange rises out of white
- Grid: hero centred; stats and capture methods are 4–5 equal cells split by vertical hairlines; bento is `2fr 3fr` then `3fr 2fr`, gap 28px; testimonials sit on a 6-column grid offset left and right; pricing is 3 equal columns
- Density: airy — one idea per screen, generous white between bands
- Nav: 84px transparent bar at rest; after 60px of scroll it shrinks into a centred 700×44 white capsule 18px from the top

## Elevation & Depth

Soft paper on light: no hard edges, only diffuse shadows, blur and glow.

- Sun halo: `conic-gradient(...)` of yellow-blush, `--t-red`, `--t-pink`, `--lilac`, `--accent` under `filter: blur(70px)`, with a white disc on top (`box-shadow: 0 0 18px 8px var(--bg); filter: blur(3px)`) so its rim feathers
- Floating paper (nav capsule, receipts, menus): `--shadow: 0 6px 30px color-mix(in srgb, var(--fg) 8%, transparent)`; mock things: `0 4px 7px -4px color-mix(in srgb, var(--fg-faint) 60%, transparent)`
- Highlighted pricing tier: `--shadow-warm: 0 57px 60px -54px color-mix(in srgb, var(--accent) 44%, transparent), 0 -27px 50px -40px color-mix(in srgb, var(--accent) 27%, transparent)` plus a 45% orange border
- Thought bubbles: `0 14px 40px -12px color-mix(in srgb, var(--accent) 22%, transparent)` on white, over a pink radial wash
- Glass buttons in the app mock: `backdrop-filter: blur(10px)`, `background: color-mix(in srgb, var(--bg) 30%, transparent)`, 1px white-70% rim, `inset 0 1px 2px` highlight
- Background items in mock-ups are `filter: blur(2.5px); opacity: .85` so one sharp card reads as "in focus"; hairlines are 1px `--border`; nothing uses an offset or solid black shadow

## Shapes

- Radius: buttons, chips, platform pills and the nav capsule are full pills (`100px`); bento cards 16px; the white sheet, pricing cards and footer sheet 20px; the app window 12px; mock cards 6px; bubbles 40px
- Circles: the sun, glass Bury/Keep buttons, avatars (44px), the play glyph (24px), nav dots (5px), thought-bubble tail dots (13px and 8px)
- Receipt note: a scalloped bottom edge via `mask: radial-gradient(5px at 50% 100%, transparent 98%, #000) 50% 100% / 12px 100% repeat-x`
- The closing arc is the top of a 1500px circle, 1px line, masked to fade out at both ends

## Components

- Buttons: orange pill, Inter Medium 15–16px, 40–44px tall, hover darkens 12% toward ink; caps variant is Nunito 700 14px `0.1em` uppercase at 48px; secondary is a grey pill (`--chip`) in slate text
- Chips: inline in a sentence, 1px stroke in the tag colour, 6% tint top-down, Nunito 600 18px, radius 36px, padding 3px 18px
- Platform pills: grey 52px pills with a 20px orange line icon and Inter 18px label
- Cards: pastel fill, no border, 40px/36px padding, a 330px stage on top for a CSS mock, then Inter Medium 30px title and 16px slate body
- Nav: wordmark left (rounded mark + Nunito 800 + tiny ®), three centre links each led by a coloured dot, a green-dot "Log in" and an orange "Sign up" on the right
- Section headers: orange Nunito eyebrow, then a 96px serif headline, then a 20px Inter subhead, all centred
- Tabs: two kinds — progress tabs with a 2px grey top rule and an orange partial fill on the active one; text tabs in grey with the active in orange plus a 5px dot under it
- Testimonials: white thought bubbles, a two-dot tail falling to a round avatar with name and role in Nunito 13px
- Dividers / decorations: vertical hairline cells, the blurred halo, the orange welcome glow, a footer sheet on an orange-left, lilac-right wash

## Do's and Don'ts

- Do set every headline in the book serif at weight 400 with negative tracking and let it wrap to two or three lines
- Do keep orange to pills, eyebrows, the NO list and one full-bleed band per page
- Do show the product as soft CSS mock-ups with one sharp card in front of blurred ones
- Do put interface words (chips, labels, buttons) in the rounded sans and explanations in Inter
- Do separate sections with colour bands and air, not rules
- Do lead links with small coloured dots instead of icons

- Don't use bold serif headlines or all-caps serif
- Don't add hard or offset shadows, dark outlines or glassy gradients on buttons
- Don't fill chips with solid colour; they are strokes with a whisper of tint
- Don't stack two pastel cards edge to edge without white between them
- Don't add logo walls, badges, star ratings or social-proof counters in boxes
- Don't animate anything faster than 200ms or with a bounce

## Motion

- Duration 700ms for settles, 200–250ms for colour fades; easing `cubic-bezier(0.19, 1, 0.22, 1)` (expo out), `linear` and `ease-in-out` for hovers
- What animates: the nav docking into a capsule, mock cards straightening and scaling to 1.04 on hover, link colour, the FAQ plus rotating 45°, a blinking caret in the search band
- What never animates: the halo, the headlines, the pastel cards themselves
- Signature move: the transparent nav melting into a floating white capsule as soon as you scroll

## Tweaks

- Sun size (`--halo-size`) and Halo blur (`--halo-blur`): how big the white disc is and how far its colours bleed.
- Card scatter (`--scatter`): rotation of every floating mock card; 0 squares them up.
- Headline tracking (`--serif-track`): how tightly the serif is set.
- Welcome glow (`--glow`): strength of the orange radial behind "Welcome to…".
- Bubble roundness (`--bubble`): corner radius of the testimonial bubbles.
- Schemes: Night Shift, Matcha, Cobalt Hour, Plum Jam.

## Reference CSS

```css
:root {
  --bg: #ffffff;
  --bg-2: #f6f4f2;
  --fg: #0d0d10;
  --fg-muted: #4a5465;
  --fg-faint: #748297;
  --accent: #ff5924;
  --accent-fg: #ffffff;
  --border: #e4e8ec;
  --sand: #f3f0e7;
  --mist: #e5eaf2;
  --sage: #dde9d3;
  --rose: #f4ecef;
  --blush: #fff1f1;
  --seafoam: #ccddd8;
  --lilac: #9b97e6;
  --t-orange: #e98f53;
  --t-pink: #e48abf;
  --t-blue: #99d2fb;
  --t-red: #ea726b;
  --t-yellow: #ffcf27;
  --live: #5bbf4a;
  --marker: #fff2a6;
  --font-display: "EB Garamond", Georgia, serif;
  --font-body: "Inter", system-ui, sans-serif;
  --font-ui: "Nunito", system-ui, sans-serif;
  --radius: 16px;
  --radius-sm: 12px;
  --radius-lg: 20px;
  --bubble: 40px;
  --pill: 100px;
  --halo-size: 1;
  --halo-blur: 70px;
  --scatter: 4;
  --serif-track: -0.05em;
  --glow: 85;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 40px;
  --space-7: 72px;
  --space-8: 128px;
  --shadow: 0 6px 30px color-mix(in srgb, var(--fg) 8%, transparent);
  --shadow-warm:
    0 57px 60px -54px color-mix(in srgb, var(--accent) 44%, transparent),
    0 -27px 50px -40px color-mix(in srgb, var(--accent) 27%, transparent);
  --ease: cubic-bezier(0.19, 1, 0.22, 1);
  --dur: 700ms;
  --max-width: 1180px;
  --band: 1370px;
  --ink-soft: color-mix(in srgb, var(--fg) 55%, var(--fg-muted));
  --chip: color-mix(in srgb, var(--fg-muted) 9%, var(--bg));
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 44px;
  padding: 0 22px;
  border: 0;
  border-radius: var(--pill);
  background: var(--accent);
  color: var(--accent-fg);
  font: 500 16px/1 var(--font-body);
}
.tag {
  display: inline-block;
  padding: 3px 18px;
  border: 1px solid var(--c);
  border-radius: 36px;
  background: linear-gradient(
    color-mix(in srgb, var(--c) 6%, transparent),
    transparent
  );
  font: 600 18px/1.4 var(--font-ui);
  color: var(--c);
}
.sun::before {
  content: "";
  position: absolute;
  inset: -14%;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    color-mix(in srgb, var(--t-yellow) 30%, var(--blush)),
    var(--t-red) 70deg,
    var(--t-pink) 105deg,
    var(--lilac) 140deg,
    color-mix(in srgb, var(--lilac) 30%, var(--bg)) 190deg,
    color-mix(in srgb, var(--t-pink) 50%, var(--bg)) 230deg,
    var(--accent) 280deg,
    var(--accent) 305deg,
    color-mix(in srgb, var(--t-orange) 60%, var(--bg)) 360deg
  );
  filter: blur(var(--halo-blur));
}
.sun::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--bg);
  box-shadow: 0 0 18px 8px var(--bg);
  filter: blur(3px);
}
.card {
  display: grid;
  grid-template-rows: 330px auto;
  gap: var(--space-5);
  padding: var(--space-6) 36px 44px;
  border-radius: var(--radius);
  background: var(--bg-c);
}
.bub blockquote {
  padding: 26px 40px;
  border-radius: var(--bubble);
  background: var(--bg);
  font: 600 17px/1.5 var(--font-ui);
  box-shadow: 0 14px 40px -12px
    color-mix(in srgb, var(--accent) 22%, transparent);
}
```

## Reference markup

```html
<header class="hero">
  <div class="sun"></div>
  <h1><span>Keep everything.</span><span>Dig up anything.</span></h1>
  <p class="chips">
    All your <span class="tag c-o">quotes</span>
    <span class="tag c-p">recipes</span>
    <span class="tag c-b">receipts</span>
    <span class="tag c-r">screenshots</span> and
    <span class="tag c-y">voice memos</span> in one quiet, private pile.
  </p>
  <div class="plat">
    <a href="#"
      ><svg><use href="#phone" /></svg>Phone app</a
    >
    <a href="#"
      ><svg><use href="#clip" /></svg>Browser clip</a
    >
  </div>
</header>
<figure class="bub" style="--col: 2 / span 3; --tail: 56%">
  <blockquote>I stopped emailing myself links.</blockquote>
  <figcaption>
    <span class="face" style="--c: var(--t-orange)">IV</span>
    <span>Ines Valkova<small>Set designer, Lisbon</small></span>
  </figcaption>
</figure>
```

## How to apply this flavor

1. Replace the target page's design tokens with the palette, fonts and spacing above; load EB Garamond, Inter and Nunito.
2. Put the page's main promise in a two-line serif headline inside the white sun, with the nouns it handles as outlined chips underneath.
3. Restyle components to match the Components section: pills for actions, pastel bento cards with soft CSS mock-ups, thought bubbles for quotes; keep the page's content and structure.
4. Use one orange band and one orange glow per page, white air everywhere else.
5. Apply the motion rules; remove any animation not described here. Check the Don't list before finishing.

## Tweaks

The viewer changed these tokens; the source below already carries them.

- Background (`--bg`): `#111113`
- Surface (`--bg-2`): `#18181b`
- Text (`--fg`): `#f3f0ea`
- Muted text (`--fg-muted`): `#a4abb8`
- Fg faint (`--fg-faint`): `#6f7684`
- Accent (`--accent`): `#ff6533`
- Border (`--border`): `#2a2c32`
- Sand (`--sand`): `#1f1d19`
- Mist (`--mist`): `#1a1e26`
- Sage (`--sage`): `#1a2119`
- Rose (`--rose`): `#241b20`
- Blush (`--blush`): `#1c1517`
- Seafoam (`--seafoam`): `#172220`
- Lilac (`--lilac`): `#8f8ae6`
- T orange (`--t-orange`): `#f2a06a`
- T pink (`--t-pink`): `#ee9acb`
- T blue (`--t-blue`): `#8fcaf5`
- T red (`--t-red`): `#f3847d`
- T yellow (`--t-yellow`): `#ffd84d`
- Live (`--live`): `#6dd35c`
- Marker (`--marker`): `#5a4b12`

## Full source

```html
<!doctype html>
<!-- mymined — a white sun in an orange-pink-lilac halo, giant book-serif headlines, outlined candy chips, pastel bento cards and thought-bubble testimonials. Calm, private, a little precious. -->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>mymined — Keep everything. Dig up anything.</title>
    <link
      href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500&family=Nunito:wght@600;700;800&display=swap"
      rel="stylesheet"
    />
    <!-- prettier-ignore -->
    <style>
:root{
--bg:#111113;
--bg-2:#18181b;
--fg:#f3f0ea;
--fg-muted:#a4abb8;
--fg-faint:#6f7684;
--accent:#ff6533;
--accent-fg:#ffffff;
--border:#2a2c32;
--sand:#1f1d19;
--mist:#1a1e26;
--sage:#1a2119;
--rose:#241b20;
--blush:#1c1517;
--seafoam:#172220;
--lilac:#8f8ae6;
--t-orange:#f2a06a;
--t-pink:#ee9acb;
--t-blue:#8fcaf5;
--t-red:#f3847d;
--t-yellow:#ffd84d;
--live:#6dd35c;
--marker:#5a4b12;
--font-display:"EB Garamond", Georgia, serif;
--font-body:"Inter", system-ui, sans-serif;
--font-ui:"Nunito", system-ui, sans-serif;
--radius:16px;
--radius-sm:12px;
--radius-lg:20px;
--bubble:40px;
--pill:100px;
--halo-size:1;
--halo-blur:70px;
--scatter:4;
--serif-track:-0.05em;
--glow:85;
--space-1:4px;
--space-2:8px;
--space-3:12px;
--space-4:16px;
--space-5:24px;
--space-6:40px;
--space-7:72px;
--space-8:128px;
--shadow:0 6px 30px color-mix(in srgb, var(--fg) 8%, transparent);
--shadow-warm:0 57px 60px -54px color-mix(in srgb, var(--accent) 44%, transparent), 0 -27px 50px -40px color-mix(in srgb, var(--accent) 27%, transparent);
--ease:cubic-bezier(0.19, 1, 0.22, 1);
--dur:700ms;
--max-width:1180px;
--band:1370px;
--ink-soft:color-mix(in srgb, var(--fg) 55%, var(--fg-muted));
--chip:color-mix(in srgb, var(--fg-muted) 9%, var(--bg));
}
*,::before,::after{box-sizing:border-box}
html{background:var(--bg)}
body{margin:0;color:var(--fg);font:400 18px/1.65 var(--font-body);letter-spacing:-0.01em;-webkit-font-smoothing:antialiased}
.flavor{position:relative;overflow-x:clip}
h1,h2,h3{margin:0;font-family:var(--font-display);font-weight:400;line-height:1;letter-spacing:var(--serif-track)}
p,figure,blockquote{margin:0}
ul{margin:0;padding:0;list-style:none}
a{color:inherit;text-decoration:none}
em{font-style:italic}
svg{display:block;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.wrap{max-width:var(--max-width);margin:0 auto;padding:0 var(--space-5)}
.center{text-align:center}
.eyebrow{font:700 14px/1.4 var(--font-ui);letter-spacing:0.14em;text-transform:uppercase;color:var(--accent)}
.eyebrow.ink{color:var(--fg)}
.h2{font-size:clamp(2.75rem, 1rem + 5vw, 6rem);line-height:0.95;text-wrap:balance}
.sub{max-width:34em;margin:0 auto;font-size:20px;line-height:1.55;letter-spacing:-0.02em;color:var(--fg-muted);text-wrap:balance}
.head{display:grid;gap:var(--space-5);justify-items:center;text-align:center}
.head .h2{max-width:12.5em}
.play{display:inline-flex;align-items:center;gap:10px;font:700 15px/1 var(--font-ui);letter-spacing:0.12em;text-transform:uppercase;color:var(--fg)}
.play i{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--accent);color:var(--accent-fg)}
.play svg{width:10px;height:10px;fill:currentColor;stroke:none}

/* buttons: orange pills, grey platform pills, nothing lifts */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);height:44px;padding:0 22px;border:0;border-radius:var(--pill);background:var(--accent);color:var(--accent-fg);font:500 16px/1 var(--font-body);letter-spacing:-0.01em;white-space:nowrap;cursor:pointer;transition:background-color 250ms ease-in-out,transform 250ms ease-in-out}
.btn:hover{background:color-mix(in srgb, var(--accent) 88%, var(--fg))}
.btn.caps{height:48px;padding:0 26px;font:700 14px/1 var(--font-ui);letter-spacing:0.1em;text-transform:uppercase}
.btn.grey{background:var(--chip);color:var(--fg-muted)}
.btn.grey:hover{background:color-mix(in srgb, var(--fg-muted) 15%, var(--bg))}
.plat{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--space-3)}
.plat a{display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 24px 0 18px;border-radius:var(--pill);background:var(--chip);font-size:18px;color:color-mix(in srgb, var(--fg) 70%, var(--fg-muted));transition:background-color 250ms ease-in-out}
.plat a:hover{background:color-mix(in srgb, var(--fg-muted) 16%, var(--bg))}
.plat svg{width:20px;height:20px;color:var(--accent)}

/* nav: transparent full-width at rest, a floating white capsule once you scroll */
.nav{position:sticky;top:0;z-index:40;height:84px;padding:0 var(--space-6);transition:padding var(--dur) var(--ease)}
.nav-in{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:100%;max-width:1440px;margin:0 auto;border-radius:var(--pill);transition:all var(--dur) var(--ease)}
.nav[data-scrolled]{padding-top:18px;height:80px}
.nav[data-scrolled] .nav-in{max-width:700px;height:44px;padding:0 6px 0 16px;background:var(--bg);box-shadow:var(--shadow)}
.mark{display:inline-flex;align-items:center;gap:8px;font:800 20px/1 var(--font-ui);letter-spacing:-0.03em}
.mark sup{margin-left:1px;font-size:9px;font-weight:700;vertical-align:8px}
.mark svg{width:20px;height:22px;stroke-width:1.7}
.links{display:flex;gap:var(--space-6)}
.links a,.login{display:inline-flex;align-items:center;gap:8px;font-size:17px;color:color-mix(in srgb, var(--fg-muted) 85%, transparent);transition:color 200ms linear}
.links a:hover,.login:hover{color:var(--fg)}
.dot{width:5px;height:5px;border-radius:50%;background:var(--accent)}
.d-y{background:var(--t-yellow)}.d-p{background:var(--t-pink)}.d-g{background:var(--live)}
.nav-r{display:flex;align-items:center;justify-content:end;gap:var(--space-5)}
.nav-r .btn{height:40px;padding:0 20px;font-size:15px}
.nav[data-scrolled] .nav-r .btn{height:34px;padding:0 16px;font-size:14px}
.burger{display:none;place-items:center;width:52px;height:40px;border-radius:var(--pill);background:var(--chip)}
.burger svg{width:20px;height:20px}

/* hero: a white sun inside a blurred conic halo */
.hero{position:relative;padding:var(--space-6) var(--space-5) 0;margin-top:-84px;padding-top:150px;text-align:center}
.sun{position:absolute;z-index:-1;top:-130px;left:50%;width:calc(var(--halo-size) * min(1100px, 118vw));aspect-ratio:1;transform:translateX(-50%)}
.sun::before{content:"";position:absolute;inset:-14%;border-radius:50%;background:conic-gradient(from 0deg, color-mix(in srgb, var(--t-yellow) 30%, var(--blush)), var(--t-red) 70deg, var(--t-pink) 105deg, var(--lilac) 140deg, color-mix(in srgb, var(--lilac) 30%, var(--bg)) 190deg, color-mix(in srgb, var(--t-pink) 50%, var(--bg)) 230deg, var(--accent) 280deg, var(--accent) 305deg, color-mix(in srgb, var(--t-orange) 60%, var(--bg)) 360deg);filter:blur(var(--halo-blur))}
.sun::after{content:"";position:absolute;inset:0;border-radius:50%;background:var(--bg);box-shadow:0 0 18px 8px var(--bg);filter:blur(3px)}
h1{position:relative;font-size:clamp(3.4rem, 0.4rem + 9.3vw, 8.75rem);line-height:0.86;letter-spacing:calc(var(--serif-track) - 0.01em);color:var(--fg)}
h1 span{display:block}
.chips{max-width:21em;margin:var(--space-6) auto var(--space-7);font-size:20px;line-height:2;letter-spacing:-0.02em;color:var(--fg-muted)}
.tag{display:inline-block;margin:0 2px;padding:3px 18px;border:1px solid var(--c);border-radius:36px;background:linear-gradient(color-mix(in srgb, var(--c) 6%, transparent), transparent);font:600 18px/1.4 var(--font-ui);color:var(--c);letter-spacing:-0.01em}
.c-o{--c:var(--t-orange)}.c-p{--c:var(--t-pink)}.c-b{--c:var(--t-blue)}.c-r{--c:var(--t-red)}.c-y{--c:var(--t-yellow)}

/* the app window: blurred canvas, scattered things, two glass buttons */
.app{position:relative;max-width:1100px;height:620px;margin:var(--space-7) auto 0;overflow:hidden;border:1px solid color-mix(in srgb, var(--border) 50%, transparent);border-radius:var(--radius-sm);background:radial-gradient(60% 50% at 70% 60%, color-mix(in srgb, var(--lilac) 28%, transparent), transparent),radial-gradient(50% 60% at 20% 30%, color-mix(in srgb, var(--t-blue) 22%, transparent), transparent),var(--mist);text-align:left}
.app-tabs{position:absolute;top:18px;right:42px;display:flex;gap:26px;font-size:14px;color:var(--fg-faint)}
.app-tabs b{position:relative;font-weight:400;color:var(--fg)}
.app-tabs b::before{content:"";position:absolute;top:-22px;left:-6px;right:-6px;height:10px;border-radius:0 0 6px 6px;background:var(--accent)}
.app-title{position:absolute;top:58px;left:58px;font:italic 400 52px/1 var(--font-display);color:color-mix(in srgb, var(--fg-faint) 60%, transparent);letter-spacing:-0.02em}
.thing{position:absolute;border-radius:6px;background:var(--bg);box-shadow:0 4px 7px -4px color-mix(in srgb, var(--fg-faint) 60%, transparent);transform:rotate(calc(var(--r, 1) * var(--scatter) * 1deg))}
.blur{filter:blur(2.5px);opacity:0.85}
.ph{background:linear-gradient(160deg, var(--a), var(--b))}
.q{padding:26px 24px;font:400 19px/1.35 var(--font-display);color:var(--fg);text-align:center}
.q::before{content:"\201C";display:block;font-size:30px;line-height:0.6}
.q::after{content:"\201D";display:block;margin-top:8px;font-size:30px;line-height:0.6}
.glass{position:absolute;left:50%;bottom:60px;display:flex;gap:6px;transform:translateX(-50%)}
.glass span{display:grid;place-items:center;width:84px;height:84px;border:1px solid color-mix(in srgb, var(--bg) 70%, transparent);border-radius:50%;background:color-mix(in srgb, var(--bg) 30%, transparent);backdrop-filter:blur(10px);font-size:15px;color:var(--fg-muted);box-shadow:inset 0 1px 2px color-mix(in srgb, var(--bg) 90%, transparent)}

/* manifesto: one long serif paragraph, then the orange NO list */
.manifesto{max-width:760px;margin:0 auto;padding:var(--space-8) var(--space-5) 0}
.manifesto .eyebrow{margin-bottom:var(--space-3);text-align:center;color:var(--fg)}
.manifesto>p:not(.eyebrow){margin-bottom:var(--space-5);font:400 clamp(1.6rem, 1rem + 1.6vw, 2.6rem)/1.2 var(--font-display);letter-spacing:-0.01em;color:var(--ink-soft)}
.manifesto p:nth-of-type(2)::first-letter{font-style:italic;font-size:1.6em;line-height:0.8;color:var(--fg)}
.manifesto b{font-weight:600;color:var(--fg)}
.nos{display:grid;justify-content:center;gap:2px;margin-top:var(--space-6)}
.nos li{font:400 clamp(1.7rem, 1rem + 2vw, 2.9rem)/1.15 var(--font-display);color:var(--ink-soft);letter-spacing:-0.01em}
.nos li b{margin-right:10px;font:800 0.94em/1 var(--font-ui);letter-spacing:-0.02em;color:var(--accent)}
.welcome{position:relative;display:grid;justify-items:center;gap:var(--space-6);padding:220px var(--space-5) 140px;background:radial-gradient(64% 46% at 50% 62%, color-mix(in srgb, var(--accent) calc(var(--glow) * 1%), transparent), color-mix(in srgb, var(--t-orange) calc(var(--glow) * 0.5%), transparent) 55%, transparent 72%);text-align:center}
.welcome h2{font-size:clamp(2.6rem, 1rem + 5vw, 5.4rem);font-style:italic;line-height:1;color:var(--accent-fg);text-shadow:0 2px 40px color-mix(in srgb, var(--accent) 30%, transparent)}
.welcome h2 span{display:block;padding-left:1.6em}
.welcome .btn{height:34px;padding:0 16px;font:700 13px/1 var(--font-ui);letter-spacing:0.08em}

/* hairline cell row: stats up top, capture methods near the end */
.cells{display:grid;grid-template-columns:repeat(var(--n, 4), minmax(0, 1fr));max-width:1000px;margin:0 auto;padding:var(--space-6) var(--space-5)}
.cells>div{display:grid;justify-items:center;align-content:center;gap:6px;min-height:166px;padding:var(--space-5) var(--space-3);border-left:1px solid var(--border);text-align:center}
.cells>div:first-child{border-left:0}
.cells b{font:400 clamp(2rem, 1.4rem + 1.6vw, 2.9rem)/1 var(--font-display);letter-spacing:-0.03em}
.cells span{font:700 13px/1.3 var(--font-ui);letter-spacing:0.08em;text-transform:uppercase;color:var(--accent)}
.cells i{display:grid;place-items:center;width:40px;height:40px;margin-bottom:8px;border-radius:10px;background:var(--c);color:var(--accent-fg)}
.cells i svg{width:22px;height:22px}
.cells.cap b{font-size:28px}
.cells.cap{--n:5}

/* sort: a search window with things floating off it */
.sort{padding:var(--space-8) var(--space-5) var(--space-7)}
.win{position:relative;max-width:600px;height:380px;margin:120px auto var(--space-6);border-top:1px solid color-mix(in srgb, var(--accent) 35%, var(--border));background:linear-gradient(var(--bg-2), var(--bg) 92%)}
.win>em{position:absolute;top:22px;left:38px;font:italic 400 34px/1 var(--font-display);color:color-mix(in srgb, var(--fg-faint) 70%, transparent)}
.ghost{position:absolute;inset:92px 26px 0 26px;display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;mask:linear-gradient(var(--fg) 60%, transparent)}
.ghost i{height:90px;border-radius:6px;background:color-mix(in srgb, var(--fg-faint) 10%, var(--bg))}
.ghost i:nth-child(2n){height:64px}
.clock{display:grid;place-items:center;padding:14px}
.clock>div{position:relative;width:110px;height:110px;border-radius:50%;background:var(--fg)}
.clock>div::before,.clock>div::after{content:"";position:absolute;bottom:50%;left:50%;width:3px;height:42px;border-radius:2px;background:var(--bg);transform-origin:50% 100%;transform:translateX(-50%) rotate(-50deg)}
.clock>div::after{height:34px;transform:translateX(-50%) rotate(64deg)}
.clock>div i{position:absolute;top:50%;left:50%;width:2px;height:48px;background:var(--t-yellow);transform-origin:50% 0;transform:rotate(18deg)}
.note{padding:12px;font-size:12px;line-height:1.55}
.note span{background:var(--marker);box-decoration-break:clone;padding:2px 4px}
.price{position:absolute;top:6px;right:6px;padding:1px 6px;border-radius:3px;background:var(--bg);font-size:10px}

/* it just works: inline pill in the headline, a collage of objects */
.works{background:var(--bg-2);padding:var(--space-8) var(--space-5)}
.pm{display:inline-block;margin:0 0.08em;padding:0.04em 0.24em 0.1em;border:0.07em solid var(--accent);border-radius:var(--pill);font:800 0.62em/1 var(--font-ui);letter-spacing:0.02em;color:var(--accent);vertical-align:0.14em}
.collage{position:relative;max-width:620px;height:500px;margin:var(--space-7) auto var(--space-6)}
.collage .thing{border-radius:6px}
.lamp{display:grid;place-items:end center;padding-bottom:70px;background:linear-gradient(var(--bg-2) 66%, color-mix(in srgb, var(--fg-faint) 14%, var(--bg)) 66%)}
.lamp b{position:relative;width:130px;height:150px}
.lamp b::before{content:"";position:absolute;top:0;left:10px;width:120px;height:62px;border-radius:120px 120px 0 0;background:radial-gradient(70% 140% at 35% 30%, color-mix(in srgb, var(--accent) 60%, var(--bg)), var(--accent) 45%, color-mix(in srgb, var(--accent) 70%, var(--fg)))}
.lamp b::after{content:"";position:absolute;bottom:0;left:20px;width:100px;height:88px;background:linear-gradient(110deg, color-mix(in srgb, var(--accent) 80%, var(--fg)), var(--accent) 50%);clip-path:polygon(50% 0, 56% 0, 100% 100%, 0 100%)}

/* orange band: personal search */
.band-o{padding:var(--space-8) var(--space-5) 120px;background:var(--accent);text-align:center}
.band-o .eyebrow{color:color-mix(in srgb, var(--fg) 75%, var(--accent))}
.band-o .sub,.band-o .play{color:var(--accent-fg)}
.band-o .play i{background:var(--accent-fg);color:var(--accent)}
.search{display:flex;align-items:center;justify-content:center;gap:var(--space-2);margin-top:var(--space-7)}
.search span{padding:8px 18px;border-radius:var(--pill);background:var(--bg);font-size:15px;color:var(--fg)}
.search em{padding:0 10px;border-right:2px solid var(--accent-fg);font:italic 400 42px/1 var(--font-display);color:var(--accent-fg)}
.search svg{width:22px;height:22px;margin-left:120px;color:var(--accent-fg)}
.res{display:flex;justify-content:center;gap:10px;margin-top:var(--space-5)}
.res i{width:112px;height:80px;border-radius:4px;background:linear-gradient(color-mix(in srgb, var(--bg) 92%, var(--accent)), var(--bg))}
.res i:nth-child(3){height:110px;margin-top:-14px;background:linear-gradient(var(--bg) 40%, color-mix(in srgb, var(--accent) 60%, var(--bg)))}

/* bento: a white sheet on the warm gradient, pastel cards inside */
.oasis{padding:0 26px var(--space-7);background:linear-gradient(var(--accent) 0, color-mix(in srgb, var(--accent) 45%, var(--blush)) 50%, var(--blush))}
.sheet{max-width:var(--band);margin:0 auto;padding:var(--space-7) 46px 46px;border-radius:var(--radius-lg);background:var(--bg)}
.bento{display:grid;grid-template-columns:2fr 3fr;gap:28px;margin-top:var(--space-7)}
.r2{display:grid;grid-template-columns:3fr 2fr;gap:28px;grid-column:1 / -1}
.card{display:grid;grid-template-rows:330px auto;gap:var(--space-5);padding:var(--space-6) 36px 44px;border-radius:var(--radius);background:var(--bg-c)}
.card h3,.hl h3{font:500 30px/1.15 var(--font-body);letter-spacing:-0.03em}
.card p,.hl p{max-width:30em;margin-top:var(--space-4);font-size:16px;line-height:1.6;color:var(--fg-muted)}
.stage{position:relative;display:grid;place-items:center}
.receipt{width:270px;padding:28px 24px 34px;background:var(--bg);font:400 16px/1.4 var(--font-ui);color:var(--fg);mask:radial-gradient(5px at 50% 100%, transparent 98%, var(--fg)) 50% 100% / 12px 100% repeat-x;box-shadow:var(--shadow)}
.receipt li{display:flex;align-items:center;gap:10px;margin-top:9px}
.receipt li::before{content:"";width:16px;height:16px;border:1.5px solid var(--fg-faint);border-radius:50%}
.receipt li.h{margin:0 0 4px;font-size:18px}
.receipt li.h::before{display:none}
.receipt li.x{color:var(--fg-faint);text-decoration:line-through}
.receipt li.x::before{background:var(--fg-faint)}
.stack .thing{position:absolute}
.reader{width:86%;height:250px;padding:30px 70px;background:var(--bg);mask:linear-gradient(var(--fg) 70%, transparent);text-align:center}
.reader small{font:500 18px/1 var(--font-display);color:var(--fg-faint);letter-spacing:0.04em}
.reader b{display:block;margin:12px 0 18px;font:400 24px/1.2 var(--font-display)}
.reader i{display:block;height:7px;margin-top:9px;border-radius:2px;background:color-mix(in srgb, var(--fg-faint) 22%, var(--bg))}
.ring{position:absolute;width:250px;height:250px;border:6px solid var(--t-red);border-radius:50%}
.tabsc{grid-column:1 / -1;padding:36px 36px 120px;border-radius:var(--radius);background:color-mix(in srgb, var(--mist) 40%, var(--bg));box-shadow:0 4px 7px -4px color-mix(in srgb, var(--fg-faint) 40%, transparent)}
.ftabs{display:grid;grid-template-columns:repeat(4, 1fr);gap:20px}
.ftabs button{padding:14px 0 0;border:0;border-top:2px solid var(--border);background:linear-gradient(var(--accent) 0 0) 0 -2px / 0 2px no-repeat;font:500 18px/1 var(--font-body);letter-spacing:-0.02em;color:var(--fg-faint);text-align:left;cursor:pointer;transition:color 200ms linear}
.ftabs button[aria-selected="true"]{background-size:34% 2px;color:var(--fg)}
.hl{display:grid;grid-template-columns:2fr 3fr;gap:var(--space-6);align-items:end;margin-top:var(--space-6)}
.hl blockquote{position:relative;font:400 21px/1.45 var(--font-display);color:color-mix(in srgb, var(--fg-faint) 70%, transparent);text-align:justify}
.hl mark{padding:2px 4px;background:var(--marker);color:var(--fg)}
.menu{position:absolute;right:-20px;top:calc(100% + 6px);display:grid;width:190px;padding:8px 0;border-radius:6px;background:var(--bg);box-shadow:var(--shadow);font:400 15px/1 var(--font-ui);color:var(--fg-muted);text-align:left}
.menu span{padding:9px 16px}
.menu span:nth-child(2){display:flex;gap:8px;align-items:center;color:var(--fg)}
.menu span:nth-child(2)::before{content:"";width:12px;height:12px;border-radius:50%;background:var(--accent)}

/* thought bubbles: white pills, a two-dot tail, a round face */
.trust{position:relative;padding:var(--space-8) var(--space-5);background:radial-gradient(55% 45% at 50% 45%, color-mix(in srgb, var(--t-pink) 55%, transparent), transparent 80%),radial-gradient(70% 60% at 50% 60%, color-mix(in srgb, var(--t-red) 30%, var(--blush)), var(--blush) 85%)}
.trust h2{color:var(--accent-fg);font-size:clamp(2.6rem, 1rem + 4.6vw, 5rem)}
.bubbles{position:relative;display:grid;grid-template-columns:repeat(6, 1fr);gap:56px 20px;max-width:1080px;margin:var(--space-7) auto 0}
.bub{position:relative;grid-column:var(--col);padding-bottom:70px}
.bub blockquote{padding:26px 40px;border-radius:var(--bubble);background:var(--bg);font:600 17px/1.5 var(--font-ui);color:var(--fg);box-shadow:0 14px 40px -12px color-mix(in srgb, var(--accent) 22%, transparent)}
.bub::before,.bub::after{content:"";position:absolute;border-radius:50%;background:var(--bg)}
.bub::before{bottom:58px;left:var(--tail, 52%);width:13px;height:13px}
.bub::after{bottom:46px;left:calc(var(--tail, 52%) - 14px);width:8px;height:8px}
.bub figcaption{position:absolute;bottom:0;left:calc(var(--tail, 52%) + 4px);display:flex;align-items:center;gap:10px;font:600 13px/1.25 var(--font-ui);color:var(--fg)}
.bub figcaption small{display:block;font-weight:400;color:var(--fg-muted)}
.face{display:grid;place-items:center;width:44px;height:44px;border:2px solid var(--bg);border-radius:50%;background:linear-gradient(140deg, var(--c), color-mix(in srgb, var(--c) 40%, var(--fg)));font:800 14px/1 var(--font-ui);color:var(--accent-fg)}
.more{display:flex;justify-content:center;margin-top:var(--space-6)}
.more svg{width:18px;height:18px;color:var(--accent)}

/* use cases: underline-dot tabs, a seafoam moodboard */
.cases{padding:var(--space-7) var(--space-5) var(--space-8);background:var(--blush)}
.utabs{display:flex;flex-wrap:wrap;justify-content:center;gap:var(--space-6);margin:var(--space-5) 0 var(--space-6)}
.utabs button{position:relative;padding:0 0 12px;border:0;background:none;font:400 19px/1 var(--font-body);color:var(--fg-faint);cursor:pointer;transition:color 200ms linear}
.utabs button[aria-selected="true"]{color:var(--accent)}
.utabs button[aria-selected="true"]::after{content:"";position:absolute;bottom:0;left:50%;width:5px;height:5px;border-radius:50%;background:var(--accent);transform:translateX(-50%)}
.mood{max-width:1180px;margin:0 auto;padding:var(--space-7) 36px 0;overflow:hidden;height:560px;border-radius:var(--radius);background:var(--seafoam)}
.mood .h2{font-size:clamp(2.2rem, 1rem + 3vw, 3.6rem)}
.masonry{columns:4;column-gap:12px;margin-top:var(--space-6)}
.masonry i{display:block;break-inside:avoid;margin-bottom:12px;border-radius:6px;background:linear-gradient(160deg, var(--a), var(--b))}

/* pricing */
.pricing{padding:var(--space-7) var(--space-5) var(--space-8);background:linear-gradient(var(--blush), var(--bg))}
.plans{display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:24px;max-width:1080px;margin:var(--space-7) auto 0;align-items:start}
.plan{display:grid;gap:var(--space-4);padding:36px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg)}
.plan.hot{border-color:color-mix(in srgb, var(--accent) 45%, transparent);box-shadow:var(--shadow-warm)}
.plan h3{font:600 14px/1 var(--font-ui);letter-spacing:0.14em;text-transform:uppercase;color:var(--accent)}
.amt{display:flex;align-items:baseline;gap:8px;font:400 64px/1 var(--font-display);letter-spacing:-0.04em}
.amt span{font:400 15px/1 var(--font-body);letter-spacing:0;color:var(--fg-faint)}
.plan p{font-size:16px;line-height:1.55;color:var(--fg-muted)}
.plan .btn{margin-top:var(--space-3)}

/* faq */
.faq{max-width:820px;margin:0 auto;padding:var(--space-8) var(--space-5) var(--space-7)}
.faq details{border-bottom:1px solid var(--border)}
.faq summary{display:flex;justify-content:space-between;gap:var(--space-5);padding:26px 0;font:400 clamp(1.4rem, 1rem + 1vw, 2rem)/1.15 var(--font-display);letter-spacing:-0.02em;list-style:none;cursor:pointer}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font:400 28px/1 var(--font-body);color:var(--accent);transition:transform 360ms ease-out}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq details p{max-width:40em;padding-bottom:26px;font-size:17px;color:var(--fg-muted)}

/* closing arc */
.arc{position:relative;padding:60px var(--space-5) var(--space-7);overflow:hidden;background:var(--blush);text-align:center}
.arc::before{content:"";position:absolute;top:120px;left:50%;width:min(1500px, 170vw);aspect-ratio:1;border:1px solid color-mix(in srgb, var(--fg) 45%, transparent);border-radius:50%;transform:translateX(-50%);mask:linear-gradient(transparent 0, var(--fg) 4%, var(--fg) 22%, transparent 34%)}
.arc .mark{position:relative;flex-direction:column;gap:2px;font-size:16px}
.arc .mark svg{width:30px;height:34px}
.statements{position:relative;display:grid;gap:var(--space-6);max-width:760px;margin:150px auto var(--space-6)}
.statements p{font:400 clamp(1.7rem, 1rem + 2vw, 2.75rem)/1.12 var(--font-display);letter-spacing:-0.02em;text-wrap:balance}
.arc small{display:block;margin-top:var(--space-4);font-size:14px;color:var(--fg-faint)}
.another{display:block;margin-top:-10px;font:600 14px/1 var(--font-ui);color:var(--accent)}

/* footer: a white sheet on a warm-to-lilac wash */
footer{padding:var(--space-6) 50px var(--space-6);background:radial-gradient(40% 70% at 0 80%, color-mix(in srgb, var(--accent) 45%, var(--t-pink)), transparent),radial-gradient(40% 70% at 100% 100%, var(--lilac), transparent),var(--blush)}
.foot{max-width:var(--band);margin:0 auto;padding:44px 50px 30px;border-radius:var(--radius-lg);background:var(--bg)}
.ft{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6)}
.ft .mark{font-size:22px}
.motto{margin-left:6px;font:400 21px/1 var(--font-display);letter-spacing:-0.02em;color:var(--lilac)}
.how{display:grid;place-items:center;align-content:center;height:110px;border-radius:var(--radius);background:color-mix(in srgb, var(--mist) 60%, var(--bg));text-align:center}
.how b{font:500 34px/1 var(--font-display);letter-spacing:-0.03em}
.how span{font:400 15px/1.6 var(--font-ui);color:var(--fg-faint)}
.fcols{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:var(--space-5);margin-top:var(--space-7)}
.fcols ul:first-child a{font-size:18px;line-height:1.6;color:var(--fg-muted)}
.fcols h4{margin:0 0 14px;font:700 12px/1 var(--font-ui);letter-spacing:0.1em;text-transform:uppercase;color:var(--fg-muted)}
.fcols li a{font:400 15px/1.6 var(--font-ui);color:var(--fg-faint);transition:color 200ms linear}
.fcols li a:hover{color:var(--accent)}
.fl{display:flex;flex-wrap:wrap;justify-content:space-between;gap:var(--space-4);margin-top:var(--space-7);padding-top:var(--space-5);border-top:1px solid var(--border);font:400 13px/1.4 var(--font-ui);color:var(--fg-faint)}
.fl ul{display:flex;gap:var(--space-4)}
.status{display:inline-flex;align-items:center;gap:8px}

@media (prefers-reduced-motion: no-preference){
.thing{transition:transform var(--dur) var(--ease)}
.thing:hover{transform:rotate(0) scale(1.04)}
.search em{animation:caret 1.1s steps(1) infinite}
@keyframes caret{50%{border-color:transparent}}
}
@media (max-width: 900px){
.links{display:none}
.nav{padding:0 var(--space-4)}
.nav-in{grid-template-columns:1fr auto}
.burger{display:grid}
.plat a{height:46px;font-size:16px}
.nav-r .login,.nav-r .btn{display:none}
.app{height:460px}
.cells{grid-template-columns:repeat(2, minmax(0, 1fr))}
.cells>div{border-left:0;border-top:1px solid var(--border)}
.cells.cap{grid-template-columns:repeat(3, minmax(0, 1fr))}
.bento,.r2,.plans,.hl,.ft,.fcols{grid-template-columns:1fr}
.sheet{padding:var(--space-6) 18px 18px}
.oasis{padding:0 10px var(--space-6)}
.card{grid-template-rows:290px auto;padding:28px 22px}
.ftabs{grid-template-columns:repeat(2, 1fr)}
.bubbles{grid-template-columns:1fr}
.bub{grid-column:1 !important}
.masonry{columns:2}
.search svg{margin-left:20px}
.res i:nth-child(n+4){display:none}
.collage,.win{width:620px;max-width:none;margin-left:50%;translate:-50% 0;scale:0.55;transform-origin:50% 0}
.collage{height:300px}
.win{height:230px;margin-top:60px}
.reader{padding:24px}
footer{padding:var(--space-5) 10px}
.foot{padding:28px 22px}
.menu{display:none}
}
    </style>
  </head>
  <body>
    <div class="flavor">
      <!-- prettier-ignore -->
      <svg width="0" height="0" style="position:absolute"><defs>
<symbol id="pebble" viewBox="0 0 20 22"><path d="M10 1.5c4.6 0 8 3.9 8 9.4S14.4 20.5 10 20.5 2 16.5 2 11 5.4 1.5 10 1.5Z"/><path d="M8.5 8.2 10 6.6l1.5 1.6L10 9.8Z"/><path d="M6.6 13.4c1 1.3 2.1 1.9 3.4 1.9"/></symbol>
<symbol id="phone" viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/></symbol>
<symbol id="tab" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M11 18h2"/></symbol>
<symbol id="desk" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></symbol>
<symbol id="clip" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></symbol>
<symbol id="mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></symbol>
<symbol id="tri" viewBox="0 0 10 10"><path d="M2 1v8l7-4Z"/></symbol>
</defs></svg>

      <!-- prettier-ignore -->
      <nav class="nav">
<div class="nav-in">
<a class="mark" href="#"><svg><use href="#pebble"/></svg><span>mymined<sup>&reg;</sup></span></a>
<div class="links"><a href="#"><i class="dot"></i>What</a><a href="#"><i class="dot d-y"></i>Why</a><a href="#"><i class="dot d-p"></i>How</a></div>
<div class="nav-r"><a class="login" href="#"><i class="dot d-g"></i>Log in</a><a class="btn" href="#">Sign up</a><a class="burger" href="#" aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M5 8h14M5 12h14M5 16h14"/></svg></a></div>
</div>
</nav>

      <!-- prettier-ignore -->
      <header class="hero">
<div class="sun"></div>
<h1><span>Keep everything.</span><span>Dig up anything.</span></h1>
<p class="chips">All your <span class="tag c-o">quotes</span> <span class="tag c-p">recipes</span> <span class="tag c-b">receipts</span> <span class="tag c-r">screenshots</span> and <span class="tag c-y">voice memos</span> in one quiet, private pile.</p>
<div class="plat">
<a href="#"><svg><use href="#phone"/></svg>Phone app</a>
<a href="#"><svg><use href="#clip"/></svg>Browser clip</a>
<a href="#"><svg><use href="#desk"/></svg>Desktop app</a>
</div>
<div class="app" aria-hidden="true">
<div class="app-tabs"><span>Everything</span><span>Piles</span><b>Dig up</b></div>
<div class="app-title">All Piles</div>
<div class="thing ph blur" style="--a:var(--fg);--b:var(--ink-soft);--r:-1;top:40px;left:330px;width:110px;height:84px"></div>
<div class="thing blur" style="--r:1;top:150px;left:60px;width:100px;height:130px"></div>
<div class="thing ph blur" style="--a:var(--t-red);--b:var(--t-yellow);--r:-2;top:380px;left:0;width:96px;height:120px"></div>
<div class="thing ph blur" style="--a:var(--sage);--b:var(--seafoam);--r:1;top:60px;right:30px;width:170px;height:130px"></div>
<div class="thing blur" style="--r:-1;top:250px;right:0;width:110px;height:120px"></div>
<div class="thing blur" style="--r:2;bottom:20px;right:130px;width:100px;height:96px"></div>
<div class="thing ph blur" style="--a:var(--sand);--b:var(--t-orange);--r:0;bottom:-30px;left:390px;width:130px;height:110px"></div>
<div class="thing q" style="--r:0;top:110px;left:50%;width:180px;margin-left:-90px">Plant the bulbs in October. Do not dig them up in March to check.</div>
<div class="glass"><span>Bury</span><span>Keep</span></div>
</div>
</header>

      <!-- prettier-ignore -->
      <section class="manifesto">
<p class="eyebrow">Our manifesto</p>
<p>Somewhere along the way, keeping a thing became a chore: pick a folder, name a tag, decide where it belongs before you know why you wanted it.</p>
<p>Our attention got rented out by the minute &ndash;</p>
<p>to feeds, to streaks, to apps that want a little more of us each week. The good stuff ended up scattered across seven inboxes and a camera roll nobody can search.</p>
<p>What you kept should stay yours, and stay findable. <b>We promise:</b></p>
<ul class="nos">
<li><b>NO</b> folders to name</li>
<li><b>NO</b> streaks or badges</li>
<li><b>NO</b> followers</li>
<li><b>NO</b> selling your pile</li>
<li><b>NO</b> collaboration</li>
<li><b>NO</b> ads, ever</li>
</ul>
</section>
      <!-- prettier-ignore -->
      <section class="welcome">
<h2>Welcome to<span>&hellip;your own mine.</span></h2>
<a class="btn" href="#">Try it out &rsaquo;</a>
</section>

      <!-- prettier-ignore -->
      <section class="cells" aria-label="Numbers">
<div><b>4.1M</b><span>things kept this week</span></div>
<div><b>0</b><span>folders required</span></div>
<div><b>0.4s</b><span>from save to sorted</span></div>
<div><b>100%</b><span>ad-free since day one</span></div>
</section>

      <!-- prettier-ignore -->
      <section class="sort">
<div class="head"><h2 class="h2">A memory that<br />sorts itself.</h2><p class="sub">Throw anything at it. mymined reads it, tags it, notices its colors and puts it exactly where you would look first.</p></div>
<div class="win" aria-hidden="true">
<em>Search my mine&hellip;</em>
<div class="ghost"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
<div class="thing q" style="--r:-1;top:6px;left:120px;width:150px;font-size:15px">A good soup is mostly patience and a decent pot.</div>
<div class="thing ph" style="--a:var(--bg-2);--b:var(--border);--r:1;top:-80px;left:240px;width:140px;height:150px"><span class="price">$48</span></div>
<div class="thing clock" style="--r:-0.5;top:40px;left:370px;width:140px;height:170px"><div><i></i></div></div>
<div class="thing note" style="--r:0.5;top:240px;left:250px;width:170px"><span>Ask the bakery on Rua Formosa if they still do the rye on Thursdays.</span></div>
</div>
<p class="center"><a class="play" href="#"><i><svg><use href="#tri"/></svg></i>See the sorting happen</a></p>
</section>

      <!-- prettier-ignore -->
      <section class="works">
<div class="head"><p class="eyebrow">It just works</p><h2 class="h2">Just drop it in. The <span class="pm">auto</span> sorter does the rest.</h2><p class="sub">Save with one tap and keep going. mymined knows a recipe from a receipt and remembers the bits that matter, so you don&rsquo;t have to.</p></div>
<div class="collage" aria-hidden="true">
<div class="thing ph" style="--a:var(--border);--b:var(--fg-faint);--r:-0.4;top:-20px;left:40px;width:160px;height:210px"></div>
<div class="thing ph" style="--a:var(--fg-muted);--b:var(--fg);--r:0.4;top:0;right:0;width:200px;height:150px"></div>
<div class="thing ph" style="--a:var(--rose);--b:var(--t-orange);--r:0.6;bottom:0;left:0;width:250px;height:170px"></div>
<div class="thing lamp" style="--r:0;top:110px;left:190px;width:290px;height:310px"><b></b></div>
</div>
<p class="center"><a class="play" href="#"><i><svg><use href="#tri"/></svg></i>How to save anything in two taps</a></p>
</section>

      <!-- prettier-ignore -->
      <section class="band-o">
<div class="head"><p class="eyebrow">No digging required</p><h2 class="h2">Tags are dead. Search by what you remember.</h2><p class="sub">Search by color, shop, season, the week you saved it. Visual cues and loose associations get you there before you finish typing.</p><a class="play" href="#"><i><svg><use href="#tri"/></svg></i>Watch it find things</a></div>
<div class="search" aria-hidden="true"><span>lamp</span><span>#orange</span><em>#coz</em><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></div>
<div class="res" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
</section>

      <!-- prettier-ignore -->
      <section class="oasis">
<div class="sheet">
<div class="head"><p class="eyebrow">Your own quiet corner</p><h2 class="h2">A deep, quiet seam of everything you kept.</h2></div>
<div class="bento">
<article class="card" style="--bg-c:var(--sand)"><div class="stage"><ul class="receipt"><li class="h">Saturday market, so remember:</li><li class="x">Two kilos of quince</li><li>Rye from the bakery</li><li class="x">Ask about the honey</li><li>Small olives, not the big ones</li><li>Flowers for Marta</li></ul></div><div><h3>Notes without ceremony</h3><p>Ideas stop slipping away. Jot it on the bus and expand it later in Quiet Mode. No titles, no templates.</p></div></article>
<article class="card w" style="--bg-c:var(--mist)"><div class="stage stack"><div class="thing ph" style="--a:var(--fg);--b:var(--ink-soft);--r:-1;top:20px;left:22%;width:120px;height:160px"></div><div class="thing q" style="--r:1;top:90px;left:8%;width:150px;font-size:15px">The kitchen is the warmest room. Put the desk there.</div><div class="thing ph" style="--a:var(--t-blue);--b:var(--bg);--r:0;top:0;right:12%;width:150px;height:210px"></div><div class="thing ph" style="--a:var(--seafoam);--b:var(--fg-faint);--r:-0.5;top:130px;left:42%;width:140px;height:150px"></div></div><div><h3>Links that know what they are</h3><p>A recipe saves as a recipe, a chair as a product with its price, an essay as something to read on the train.</p></div></article>
<div class="r2">
<article class="card" style="--bg-c:var(--sage)"><div class="stage"><div class="reader"><small>field notes</small><b>On the patience of ferns, and other slow things</b><i></i><i></i><i style="width:80%"></i><i></i><i style="width:60%"></i></div></div><div><h3>Read it later, actually</h3><p>Save whole articles and read them without banners, pop-ups or a sidebar of things you didn&rsquo;t ask for.</p></div></article>
<article class="card" style="--bg-c:var(--rose)"><div class="stage stack"><div class="ring"></div><div class="thing ph" style="--a:var(--t-red);--b:var(--sand);--r:-1;top:10px;left:14%;width:110px;height:120px"></div><div class="thing ph" style="--a:var(--bg);--b:var(--t-red);--r:1;top:70px;right:10%;width:120px;height:140px"></div><div class="thing ph" style="--a:var(--t-orange);--b:var(--fg);--r:0;top:160px;left:28%;width:110px;height:120px"></div></div><div><h3>Piles that build themselves</h3><p>Make a Smart Pile once. Everything that fits drifts into it on its own.</p></div></article>
</div>
<div class="tabsc">
<div class="ftabs" role="tablist"><button aria-selected="false">Same vibe</button><button aria-selected="false">Quiet mode</button><button aria-selected="true">Keep a sentence</button><button aria-selected="false">Text in photos</button></div>
<div class="hl"><div><h3>Keep the good sentence</h3><p>Highlight a line in any article or newsletter and mymined files it with the page it came from.</p></div>
<blockquote>Most of what we read is weather; it passes. <mark>But now and then a sentence lands like a stone in the pocket, and you carry it for years without</mark> knowing why it stayed when the rest washed out.<span class="menu"><span>Copy text</span><span>Keep in mymined</span><span>Look up</span></span></blockquote></div>
</div>
</div>
</div>
</section>

      <!-- prettier-ignore -->
      <section class="trust">
<div class="head"><h2>Loved by hoarders<br />&amp; tidy people alike.</h2></div>
<div class="bubbles">
<figure class="bub" style="--col:2 / span 3;--tail:56%"><blockquote>I stopped emailing myself links. That alone gave me back an evening a week.</blockquote><figcaption><span class="face" style="--c:var(--t-orange)">IV</span><span>Ines Valkova<small>Set designer, Lisbon</small></span></figcaption></figure>
<figure class="bub" style="--col:4 / span 3;--tail:30%"><blockquote>Three years of field photos, finally searchable by &ldquo;that mossy one near the bridge&rdquo;.</blockquote><figcaption><span class="face" style="--c:var(--sage)">TR</span><span>Tomasz Rehberg<small>PhD candidate, soil ecology</small></span></figcaption></figure>
<figure class="bub" style="--col:1 / span 3;--tail:22%"><blockquote>Every recipe I&rsquo;ve ever screenshotted is in here. It even pulls out the oven temperature.</blockquote><figcaption><span class="face" style="--c:var(--t-pink)">PA</span><span>Priya Anand<small>Sous-chef, Leeds</small></span></figcaption></figure>
</div>
<a class="more play" href="#"><svg viewBox="0 0 24 24"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>Not convinced? There&rsquo;s more</a>
</section>

      <!-- prettier-ignore -->
      <section class="cases">
<div class="head"><p class="eyebrow">For every kind of keeper</p><h2 class="h2">For magpies of all kinds.</h2></div>
<div class="utabs" role="tablist"><button aria-selected="true">Designers</button><button aria-selected="false">Cooks</button><button aria-selected="false">Researchers</button><button aria-selected="false">Writers</button><button aria-selected="false">Collectors</button></div>
<div class="mood">
<div class="head"><p class="eyebrow ink">Made for designers</p><h2 class="h2">Moodboards that<br /><em>assemble themselves.</em></h2></div>
<div class="masonry" aria-hidden="true"><i style="height:150px;--a:var(--sage);--b:var(--seafoam)"></i><i style="height:220px;--a:var(--fg-muted);--b:var(--fg)"></i><i style="height:120px;--a:var(--sand);--b:var(--t-orange)"></i><i style="height:200px;--a:var(--seafoam);--b:var(--fg-faint)"></i><i style="height:240px;--a:var(--mist);--b:var(--sage)"></i><i style="height:140px;--a:var(--sage);--b:var(--fg-muted)"></i><i style="height:180px;--a:var(--bg);--b:var(--seafoam)"></i><i style="height:150px;--a:var(--rose);--b:var(--fg-faint)"></i></div>
</div>
</section>

      <!-- prettier-ignore -->
      <section class="pricing">
<div class="head"><p class="eyebrow">Pricing</p><h2 class="h2">Free to start. Cheap to keep.</h2></div>
<div class="plans">
<div class="plan"><h3>Pebble</h3><div class="amt">$0<span>forever</span></div><p>Your first 300 things, full search and the phone app. Enough to find out if you&rsquo;re a keeper.</p><a class="btn grey" href="#">Start a pile</a></div>
<div class="plan hot"><h3>Seam</h3><div class="amt">$8<span>per month</span></div><p>Unlimited things, the reader, Smart Piles, text in photos and every device you own.</p><a class="btn" href="#">Open your mine</a></div>
<div class="plan"><h3>Household</h3><div class="amt">$14<span>per month</span></div><p>Five private mines on one bill. Nobody sees anybody else&rsquo;s, not even the person paying.</p><a class="btn grey" href="#">Add the family</a></div>
</div>
</section>

      <!-- prettier-ignore -->
      <section class="faq">
<div class="head"><p class="eyebrow">Questions</p><h2 class="h2">Asked, and kept.</h2></div>
<details open><summary>Can anyone else see what I save?</summary><p>No. There is no sharing, no public profile and no feed. Your mine is encrypted on our servers and readable only from your signed-in devices.</p></details>
<details><summary>Do I really never have to tag things?</summary><p>Never. You can add a tag if it makes you happy, but search reads the text, colors and source of every item without your help.</p></details>
<details><summary>What happens if I stop paying?</summary><p>You drop back to Pebble. Nothing is deleted; you can still search and open everything, you just can&rsquo;t add past 300 things.</p></details>
<details><summary>Can I bring my old bookmarks?</summary><p>Yes. Export them from any browser or notes app as a file and drop it in. A few thousand links take about four minutes to sort.</p></details>
</section>

      <!-- prettier-ignore -->
      <section class="arc">
<a class="mark" href="#"><svg><use href="#pebble"/></svg>mymined</a>
<div class="statements">
<h2 class="h2" style="font-size:clamp(1.9rem, 1rem + 2.4vw, 3rem)">We&rsquo;re trying a quieter kind of app. One that remembers so you don&rsquo;t have to perform remembering.</h2>
<p>We put privacy first.</p>
<p>We&rsquo;d rather you spend less time filing your life and more time noticing it.</p>
</div>
<a class="btn caps" href="#">Sign up for free</a>
<small>Free for your first 300 things. No card, no trial clock.</small>
<div class="cells cap">
<div><i style="--c:var(--accent)"><svg><use href="#phone"/></svg></i><b>Phone</b><span>Get app</span></div>
<div><i style="--c:var(--t-pink)"><svg><use href="#tab"/></svg></i><b>Tablet</b><span>Get app</span></div>
<div><i style="--c:var(--t-blue)"><svg><use href="#clip"/></svg></i><b>Browser</b><span>Add clip</span></div>
<div><i style="--c:var(--lilac)"><svg><use href="#desk"/></svg></i><b>Desktop</b><span>Download</span></div>
<div><i style="--c:var(--t-yellow)"><svg><use href="#mail"/></svg></i><b>Email</b><span>Forward in</span></div>
</div>
<a class="another" href="#">Looking for another way in?</a>
</section>

      <!-- prettier-ignore -->
      <footer>
<div class="foot">
<div class="ft">
<div><a class="mark" href="#"><svg><use href="#pebble"/></svg>mymined</a><span class="motto">&middot; Nobody mines it but you.</span></div>
<a class="how" href="#"><b>See how it works</b><span>mymined walkthroughs</span></a>
</div>
<div class="fcols">
<ul><li><a href="#">Why people keep things here</a></li><li><a href="#">Our pricing</a></li><li><a href="#">See how it works</a></li><li><a href="#">mymined for researchers</a></li></ul>
<ul><h4>Our apps</h4><li><a href="#">Phone app</a></li><li><a href="#">Tablet app</a></li><li><a href="#">Browser clip</a></li><li><a href="#">Desktop app</a></li></ul>
<ul><h4>About us</h4><li><a href="#">Our manifesto</a></li><li><a href="#">Our promise</a></li></ul>
<ul><h4>Help and contact</h4><li><a href="#">Guides &amp; contact</a></li><li><a href="#">Video tutorials</a></li><li><a href="#">Sign in</a></li><li><a href="#">Create an account</a></li></ul>
</div>
<div class="fl">
<span>&copy; mymined, inc. 2026</span>
<span>Made slowly in Porto, Portugal</span>
<span class="status"><i class="dot d-g"></i>All mines open &middot; synced 2s ago</span>
<ul><li><a href="#">Terms</a></li><li><a href="#">Privacy</a></li><li><a href="#">FAQ</a></li></ul>
</div>
</div>
</footer>
    </div>
    <!-- prettier-ignore -->
    <script type="application/json" data-flavor-tweaks>
{"controls":[{"var":"--halo-size","label":"Sun size","min":0.7,"max":1.35,"step":0.01},{"var":"--halo-blur","label":"Halo blur","min":20,"max":140,"step":2,"unit":"px"},{"var":"--scatter","label":"Card scatter","min":0,"max":10,"step":0.5},{"var":"--serif-track","label":"Headline tracking","min":-0.08,"max":0,"step":0.005,"unit":"em"},{"var":"--glow","label":"Welcome glow","min":0,"max":100,"step":1},{"var":"--bubble","label":"Bubble roundness","min":12,"max":60,"step":1,"unit":"px"}],
"schemes":[
{"name":"Night Shift","vars":{"--bg":"#111113","--bg-2":"#18181b","--fg":"#f3f0ea","--fg-muted":"#a4abb8","--fg-faint":"#6f7684","--accent":"#ff6533","--accent-fg":"#ffffff","--border":"#2a2c32","--sand":"#1f1d19","--mist":"#1a1e26","--sage":"#1a2119","--rose":"#241b20","--blush":"#1c1517","--seafoam":"#172220","--lilac":"#8f8ae6","--t-orange":"#f2a06a","--t-pink":"#ee9acb","--t-blue":"#8fcaf5","--t-red":"#f3847d","--t-yellow":"#ffd84d","--live":"#6dd35c","--marker":"#5a4b12"}},
{"name":"Matcha","vars":{"--bg":"#fdfdf9","--bg-2":"#f1f3ea","--fg":"#121a12","--fg-muted":"#4d5a4c","--fg-faint":"#7d8a7b","--accent":"#3e8f47","--accent-fg":"#ffffff","--border":"#e1e6db","--sand":"#eef0e2","--mist":"#e4ebe6","--sage":"#d7e6cf","--rose":"#efeee4","--blush":"#f4f7ec","--seafoam":"#c9ddd0","--lilac":"#a7b98f","--t-orange":"#c49a4a","--t-pink":"#c98aa8","--t-blue":"#7fb8c9","--t-red":"#d07a5f","--t-yellow":"#d9b72c","--live":"#3e8f47","--marker":"#eef3a0"}},
{"name":"Cobalt Hour","vars":{"--bg":"#ffffff","--bg-2":"#f2f4f9","--fg":"#0b1330","--fg-muted":"#47506b","--fg-faint":"#7a849e","--accent":"#2d4dff","--accent-fg":"#ffffff","--border":"#e2e6f0","--sand":"#eef0f7","--mist":"#e3e9f7","--sage":"#e1edf0","--rose":"#efe9f6","--blush":"#f3f4ff","--seafoam":"#d3def3","--lilac":"#8c8cf0","--t-orange":"#f0915a","--t-pink":"#c98ae4","--t-blue":"#6fb7f7","--t-red":"#e8706e","--t-yellow":"#f4c430","--live":"#31b37a","--marker":"#dfe8ff"}},
{"name":"Plum Jam","vars":{"--bg":"#fffafb","--bg-2":"#f7eef1","--fg":"#1d0f17","--fg-muted":"#5c4552","--fg-faint":"#91778a","--accent":"#b8336a","--accent-fg":"#ffffff","--border":"#eddde3","--sand":"#f5ece6","--mist":"#ece6f1","--sage":"#e9ecdf","--rose":"#f6e4ec","--blush":"#fff0f4","--seafoam":"#e0d8e6","--lilac":"#b48fd9","--t-orange":"#e0894f","--t-pink":"#d9679f","--t-blue":"#8fb4e6","--t-red":"#d9545a","--t-yellow":"#eebb2f","--live":"#4fa868","--marker":"#ffe3ef"}}
]}
</script>
    <!-- prettier-ignore -->
    <script>
const nav = document.querySelector(".nav");
const onScroll = () => nav.toggleAttribute("data-scrolled", scrollY > 60);
addEventListener("scroll", onScroll, { passive: true });
onScroll();
document.querySelectorAll("[role=tablist]").forEach((list) => {
const tabs = [...list.querySelectorAll("button")];
tabs.forEach((tab) => tab.addEventListener("click", () => tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)))));
});
</script>
  </body>
</html>
```
