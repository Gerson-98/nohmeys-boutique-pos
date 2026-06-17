---
name: Nohemy's Boutique POS
description: Sistema de punto de venta cálido y eficiente para una boutique de ropa femenina en Guatemala
colors:
  antique-gold: "#C9A84C"
  antique-gold-light: "#E8D5A3"
  antique-gold-hover: "#B8963E"
  petal-blush: "#F2C4CE"
  petal-blush-light: "#F8E1E7"
  petal-blush-dark: "#E8A0B0"
  ink: "#2C2C2C"
  surface: "#FAFAFA"
  surface-soft: "#F5F5F5"
  muted: "#9E9E9E"
  success: "#6DBF94"
  warning: "#F5C842"
  danger: "#E57373"
  info: "#7EC8E3"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  mono:
    fontFamily: "JetBrains Mono, Courier New, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  sm: "8px"
  md: "12px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.antique-gold}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.antique-gold-hover}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.antique-gold}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.petal-blush-light}"
    textColor: "{colors.antique-gold}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "16px"
  input:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Nohemy's Boutique POS

## 1. Overview

**Creative North Star: "El Mostrador de la Boutique" (The Boutique Counter)**

Nohemy's Boutique POS feels like standing at the counter of a well-run boutique: warm, attentive, a little precious in its details — and completely unfussy when it's time to ring up a sale. Petal Blush and Antique Gold carry the warmth and identity; Playfair Display gives titles their boutique elegance; Inter keeps the working interface plain and fast to read; JetBrains Mono turns every price, ticket number, and SKU into something that reads like a printed receipt — exact, trustworthy, scannable.

This system explicitly rejects the generic SaaS-dashboard look (cold corporate blues, identical stat cards, gray-on-gray density), and it rejects the opposite failure too: an overly cute or "femenino" palette tipped into childish decoration. The personality is **elegante, cálido, profesional** — adult warmth, not whimsy. Per the product's design principles, speed beats density: cashiers on tablets need large, obvious, fast controls, not a screen full of data.

**Key Characteristics:**
- Warm Petal Blush + Antique Gold accents on near-white surfaces (Boutique White / Soft Gray)
- Playfair Display serif for titles only; Inter for all working UI text; JetBrains Mono for anything transactional (prices, totals, ticket #s, SKUs)
- Depth comes from a single soft "ambient blush glow," never hard gray shadows
- Generously rounded corners (12px) on every interactive surface
- Role-aware density: cashiers get large, minimal controls; admins get fuller dashboards

## 2. Colors

The palette is restrained: one warm gold accent for action, one blush tone for warmth/ambience, and a small set of soft neutrals. Status colors (success/warning/danger/info) are used sparingly and only for their semantic role.

### Primary
- **Antique Gold** (#C9A84C): the only "act here" color — primary buttons, active nav state, links, key monetary totals (KPI values, ticket totals). Hover state darkens to #B8963E.

### Secondary
- **Petal Blush** (#F2C4CE): ambient warmth — card borders, active-nav background, dividers, soft highlight fills. Never used for calls-to-action.
- **Petal Blush Light** (#F8E1E7): hover backgrounds, subtle tinted panels.
- **Petal Blush Dark** (#E8A0B0): stronger blush accents, e.g. emphasis borders.

### Neutral
- **Soft Charcoal Ink** (#2C2C2C): primary text and headings.
- **Boutique White** (#FAFAFA): default surface — cards, panels, app background.
- **Soft Gray** (#F5F5F5): page background behind cards, mobile header bar.
- **Quiet Gray** (#9E9E9E): secondary/muted text, captions, placeholders, inactive icons.

### Status (use sparingly)
- **Success** (#6DBF94): caja abierta, completed states, positive deltas.
- **Warning** (#F5C842): caja cerrada, low-stock attention without being an error.
- **Danger** (#E57373): destructive actions, out-of-stock, errors.
- **Info** (#7EC8E3): informational badges (e.g. client counts).

### Named Rules
**The Single Accent Rule.** Antique Gold is the only color that means "act here" — primary buttons, active states, and the numbers that matter most (totals, KPI headline values). If a second element on screen competes for that signal in gold, one of them is wrong.

**The Blush-Is-Ambient Rule.** Petal Blush (and its light/dark steps) is atmosphere: borders, soft fills, hover backgrounds, the glow under cards. It never carries a click target's meaning on its own.

## 3. Typography

**Display Font:** Playfair Display (Georgia fallback)
**Body Font:** Inter (system-ui fallback)
**Mono Font:** JetBrains Mono (Courier New fallback)

**Character:** A refined serif for moments of arrival (page titles, section headers) paired with a clean, quiet grotesque for everything operational, and a monospace "ledger voice" for anything that represents money or an identifier — together they read like a boutique invoice: an elegant letterhead, plain working copy, and precise printed figures.

### Hierarchy
- **Display** (700, 1.5rem/24px, line-height 1.2): page-level titles, e.g. "Buenos días, Nohemy's Boutique". Playfair Display only.
- **Headline** (600, 1rem/16px, line-height 1.4): section and card titles ("Ingresos — últimos 7 días"). Playfair Display.
- **Body** (400, 0.875rem/14px, line-height 1.5, max ~70ch): form labels, descriptions, table cells, nav labels. Inter.
- **Label** (500, 0.75rem/12px down to 0.625rem/10px): captions, helper text, timestamps, badges. Inter, Quiet Gray.
- **Mono Value** (700, scales from 0.75rem ticket numbers up to 1.5rem KPI headline figures): prices, totals, ticket numbers, SKUs. JetBrains Mono, usually in Antique Gold or Ink.

### Named Rules
**The Ledger Numbers Rule.** Any number that represents money, a ticket/order identifier, or a SKU renders in JetBrains Mono — regardless of what font surrounds it. This is the visual cue that "this number is exact and won't change."

**The One Serif Rule.** Playfair Display appears only in Display and Headline roles (page/section titles). It never appears in body copy, buttons, table cells, or form fields — that's where it would slow reading down.

## 4. Elevation

The system is nearly flat. Depth is not communicated with stacked Material-style shadows — it's communicated with one consistent **ambient blush glow**: a soft, warm-tinted shadow that every elevated surface (cards, panels, popovers) shares equally. There is no "more elevated = darker/bigger shadow" ladder; hierarchy comes from color, border, and spacing instead.

### Shadow Vocabulary
- **Ambient Blush Glow** (`box-shadow: 0 2px 8px rgba(242, 196, 206, 0.3)`): applied to every `card-boutique` surface — KPI tiles, panels, modals. The only shadow in the system.

### Named Rules
**The One Shadow Rule.** There is exactly one elevation shadow — the ambient blush glow. Never introduce a second, darker, gray, or larger-blur shadow; if something needs to feel "more important," use color (Antique Gold border/text) or size, not a heavier shadow.

## 5. Components

### Buttons
- **Shape:** rounded-xl (12px) on every variant.
- **Primary** (`btn-boutique-primary`): Antique Gold background (#C9A84C), white text, font-medium, `px-4 py-2`. Hover darkens to #B8963E.
- **Secondary** (`btn-boutique-secondary`): white background, 1px Antique Gold border, Antique Gold text. Hover fills with Petal Blush Light (#F8E1E7).
- **Danger** (`btn-boutique-danger`): Danger background (#E57373), white text. Hover darkens to #d65f5f.
- **Hover/Focus:** color-only transitions (`transition-colors duration-200`) — never a shadow or scale change.

### Cards / Containers
- **Corner Style:** rounded-xl (12px).
- **Background:** Boutique White (#FAFAFA).
- **Border:** 1px Petal Blush (#F2C4CE); status-tinted cards (caja abierta/cerrada, stock alerts) swap the border/background tint to the relevant status color at ~10–40% opacity while keeping the same shape and glow.
- **Shadow Strategy:** Ambient Blush Glow (see Elevation) — same on every card regardless of importance.
- **Internal Padding:** 16px (`p-4`) for tiles, 20px (`p-5`) for content panels.

### Inputs / Fields (`input-boutique`)
- **Style:** 1px Antique Gold Light border (#E8D5A3), rounded-xl (12px), `px-3 py-2`, `text-sm`.
- **Focus:** border shifts to Antique Gold (#C9A84C) with a Petal Blush focus ring (`ring-2 ring-[#F2C4CE]`) — no shadow change, just color.
- **Placeholder/Disabled:** Quiet Gray (#9E9E9E) text.

### Navigation (Sidebar)
- **Style:** white background, right border in Petal Blush (#F2C4CE). Nav items: `rounded-xl`, `text-sm font-medium`, Soft Charcoal Ink by default.
- **Active state:** Petal Blush background, Antique Gold text. (Current implementation also adds a 4px Antique Gold left border on the active item — this is the one place a stripe accent exists in the system; don't add new ones elsewhere.)
- **Hover:** Petal Blush Light background.
- **Mobile:** collapses to a header bar (Soft Gray/white, Petal Blush bottom border) with a drawer (`MobileSidebar`).

### KPI / Stat Tiles (signature component)
A `card-boutique` with: icon + Quiet Gray label on top row, a large Mono Value (Antique Gold or Ink depending on sentiment) as the headline, and a small Quiet Gray sub-caption below. Status-relevant tiles (e.g. low-stock alerts) use a subtle two-stop gradient from a tinted status color to Boutique White, with the border at ~40% opacity of that status color.

## 6. Do's and Don'ts

### Do:
- **Do** reserve Antique Gold (#C9A84C) for primary actions, active states, and headline monetary values — the Single Accent Rule.
- **Do** render every price, total, ticket number, and SKU in JetBrains Mono — the Ledger Numbers Rule.
- **Do** use Playfair Display only for page and section titles — the One Serif Rule.
- **Do** keep corners at 12px (rounded-xl) across buttons, cards, panels, and inputs for one consistent silhouette.
- **Do** use the single Ambient Blush Glow shadow for every elevated surface — the One Shadow Rule.
- **Do** size touch targets generously (comfortable `px-4 py-2` minimum) for tablet/touchscreen POS use, per the product's "velocidad sobre densidad" principle.

### Don't:
- **Don't** introduce cold blues, corporate grays, or generic SaaS-dashboard color schemes — every accent should read as Petal Blush or Antique Gold.
- **Don't** let the "elegante, cálido, femenino" personality tip into childish or cursi — no pastel mascots, no playful display fonts beyond Playfair Display, no decorative illustration.
- **Don't** add a second shadow style, gray drop shadow, or Material-style elevation ladder.
- **Don't** overload screens with dense tables or controls for cashier-facing flows — fewer, larger actions over more data, per PRODUCT.md.
- **Don't** use gradient text or glassmorphism.
- **Don't** add new colored left/right "stripe" border accents — the sidebar's active-state left border is the one existing exception; don't extend the pattern to cards, list items, or alerts.
