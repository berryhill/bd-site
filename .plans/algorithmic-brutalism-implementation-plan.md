# Algorithmic Brutalism Implementation Plan

**Project**: berryhill.dev Algorithmic Brutalism Theme  
**Date**: 2025-10-24  
**Style**: Algorithmic Brutalism - Raw, Bold, Unapologetic  
**Approach**: Simple, direct implementation

---

## What is Algorithmic Brutalism?

Based on research from ACM, Design Magazine, and brutalist web design resources, Algorithmic Brutalism combines:

### Core Philosophy
- **Raw & Unfinished**: Exposed structure, minimal styling
- **Function Over Form**: Content and usability first, aesthetics second
- **Algorithmic Generation**: Systematic, rule-based design patterns
- **Honest & Direct**: No hiding the underlying web structure
- **Rebellious**: Challenges conventional "pretty" design norms

### Key Characteristics

**Visual Elements:**
- Monospace fonts everywhere (system fonts preferred)
- Default browser styles (blue links, Times New Roman fallbacks)
- Stark black/white or high contrast colors
- Exposed HTML structure
- Minimal to no images
- Raw borders and boxes
- Asymmetric layouts
- Overlapping elements
- Visible grid systems

**Typography:**
- Monospace fonts (Courier, Consolas, Monaco)
- Oversized, bold headings
- Harsh contrast between sizes
- Unconventional line breaks
- Text as visual element
- ASCII art and symbols

**Colors:**
- High contrast (black/white, primary colors)
- Neon accents on dark backgrounds
- System colors (default blue links)
- Stark, unblended palettes
- No gradients (or harsh gradients)

**Layout:**
- Exposed grid lines
- Asymmetric positioning
- Overlapping content
- Broken hierarchy (intentional)
- Raw HTML tables
- Visible borders everywhere
- No rounded corners (or extreme rounding)

**Interaction:**
- Default browser behaviors
- Harsh transitions (or none)
- Visible states (underlines, outlines)
- Brutally honest error messages
- No smooth animations

---

## Implementation Strategy

### Phase 1: Typography Brutalism

**Goal**: Raw, monospace-first typography with harsh contrasts

#### Task 1.1: Monospace Everything
**File**: `src/styles/global.css`

```css
@layer base {
  * {
    font-family: 'Courier New', Courier, monospace !important;
  }
  
  body {
    font-size: 16px;
    line-height: 1.4;
    letter-spacing: 0;
  }
  
  /* Oversized, brutal headings */
  h1 {
    font-size: 72px;
    font-weight: 900;
    line-height: 0.9;
    text-transform: uppercase;
    letter-spacing: -2px;
  }
  
  h2 {
    font-size: 48px;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
  }
  
  h3 {
    font-size: 32px;
    font-weight: 700;
    line-height: 1.1;
  }
  
  /* Raw link styles */
  a {
    color: #0000EE; /* Default browser blue */
    text-decoration: underline;
  }
  
  a:visited {
    color: #551A8B; /* Default browser purple */
  }
  
  a:hover {
    background: yellow;
    color: black;
  }
}
```

---

### Phase 2: Stark Color Scheme

**Goal**: High contrast, brutally simple colors

#### Task 2.1: Black & White Base
**File**: `src/styles/global.css`

```css
:root,
html[data-theme="light"] {
  --background: #ffffff;
  --foreground: #000000;
  --accent: #0000EE;
  --muted: #cccccc;
  --border: #000000;
  --highlight: #ffff00;
}

html[data-theme="dark"] {
  --background: #000000;
  --foreground: #00ff00; /* Terminal green */
  --accent: #00ffff; /* Cyan */
  --muted: #333333;
  --border: #00ff00;
  --highlight: #ff00ff; /* Magenta */
}

@layer base {
  body {
    background: var(--background);
    color: var(--foreground);
  }
}
```

---

### Phase 3: Exposed Structure

**Goal**: Make the grid and structure visible

#### Task 3.1: Visible Borders Everywhere
**File**: `src/styles/global.css`

```css
@layer base {
  /* Border everything */
  section {
    border: 3px solid var(--border);
    padding: 20px;
    margin: 20px 0;
  }
  
  /* Visible grid */
  .grid {
    display: grid;
    gap: 0;
    border: 2px solid var(--border);
  }
  
  .grid > * {
    border: 1px solid var(--border);
    padding: 15px;
  }
  
  /* Raw boxes */
  * {
    box-sizing: border-box;
    outline: 1px solid transparent;
  }
  
  *:focus {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
}
```

#### Task 3.2: Exposed Grid Lines
**File**: `src/styles/global.css`

```css
@layer utilities {
  /* Show grid structure */
  .brutalist-grid {
    background-image: 
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 20px 20px;
    background-position: -1px -1px;
  }
  
  /* Asymmetric positioning */
  .offset-brutal {
    position: relative;
    left: -10px;
    top: 5px;
  }
}
```

---

### Phase 4: Brutal Components

**Goal**: Raw, unpolished component styling

#### Task 4.1: Brutal Card Component
**File**: `src/components/Card.astro`

```astro
<li class="brutal-card">
  <div class="card-border">
    <!-- Exposed metadata -->
    <div class="card-meta">
      [{pubDatetime.toISOString().split('T')[0]}]
    </div>
    
    <!-- Raw link -->
    <a href={getPath(id, filePath)}>
      {variant === "h2" ? (
        <h2>[{title.toUpperCase()}]</h2>
      ) : (
        <h3>>>> {title}</h3>
      )}
    </a>
    
    <!-- Plain description -->
    <p class="card-desc">
      {description}
    </p>
    
    <!-- ASCII arrow -->
    <div class="card-arrow">
      ──────────────────>
    </div>
  </div>
</li>

<style>
  .brutal-card {
    border: 3px solid black;
    background: white;
    padding: 0;
    margin: 15px 0;
    list-style: none;
  }
  
  .card-border {
    border: 1px solid black;
    margin: 5px;
    padding: 15px;
  }
  
  .card-meta {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    margin-bottom: 10px;
    text-transform: uppercase;
  }
  
  .card-desc {
    margin: 10px 0;
    line-height: 1.4;
  }
  
  .card-arrow {
    font-family: monospace;
    margin-top: 10px;
    font-size: 14px;
  }
  
  .brutal-card:hover {
    background: yellow;
    transform: translate(-3px, -3px);
    box-shadow: 3px 3px 0 black;
  }
</style>
```

#### Task 4.2: Brutal Hero Section
**File**: `src/pages/index.astro`

```astro
<section id="hero" class="brutalist-hero">
  <!-- ASCII art header -->
  <pre class="ascii-art">
╔══════════════════════════════════════╗
║   BERRYHILL.DEV                      ║
║   ALGORITHMIC BRUTALISM              ║
╚══════════════════════════════════════╝
  </pre>
  
  <!-- Raw heading -->
  <h1>
    WELCOME_TO_MY_
    <br>CORNER_OF_THE_
    <br>INTERNET
  </h1>
  
  <!-- Exposed list -->
  <ul class="brutal-list">
    <li>[X] AGENTIC-FIRST DEVELOPMENT</li>
    <li>[X] AI/ML SYSTEMS</li>
    <li>[X] WEB3 SMART CONTRACTS</li>
    <li>[X] INTELLIGENT AUTOMATION</li>
  </ul>
  
  <!-- Raw links -->
  <div class="brutal-links">
    <a href="/rss.xml">[RSS_FEED]</a>
    <a href="/posts/">[ALL_POSTS]</a>
    <a href="/search/">[SEARCH]</a>
  </div>
</section>

<style>
  .brutalist-hero {
    border: 5px solid black;
    padding: 30px;
    background: white;
    margin: 20px 0;
  }
  
  .ascii-art {
    font-family: monospace;
    font-size: 14px;
    line-height: 1.2;
    margin-bottom: 20px;
    overflow-x: auto;
  }
  
  .brutal-list {
    list-style: none;
    padding: 0;
    margin: 20px 0;
    font-size: 18px;
    line-height: 1.8;
  }
  
  .brutal-links {
    margin-top: 30px;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }
  
  .brutal-links a {
    border: 2px solid black;
    padding: 10px 20px;
    background: white;
    text-decoration: none;
    font-weight: bold;
  }
  
  .brutal-links a:hover {
    background: black;
    color: white;
  }
</style>
```

---

### Phase 5: Algorithmic Patterns

**Goal**: Systematic, rule-based visual patterns

#### Task 5.1: Grid Pattern Background
**File**: `src/styles/global.css`

```css
@layer base {
  body {
    background-image: 
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 19px,
        #e0e0e0 19px,
        #e0e0e0 20px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 19px,
        #e0e0e0 19px,
        #e0e0e0 20px
      );
    background-size: 20px 20px;
  }
  
  html[data-theme="dark"] body {
    background-image: 
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 19px,
        #1a1a1a 19px,
        #1a1a1a 20px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 19px,
        #1a1a1a 19px,
        #1a1a1a 20px
      );
  }
}
```

#### Task 5.2: Systematic Spacing
**File**: `src/styles/global.css`

```css
@layer utilities {
  /* Brutal spacing - multiples of 5px only */
  .space-brutal-1 { margin: 5px; }
  .space-brutal-2 { margin: 10px; }
  .space-brutal-3 { margin: 15px; }
  .space-brutal-4 { margin: 20px; }
  .space-brutal-5 { margin: 25px; }
  
  /* Algorithmic positioning */
  .algo-offset-1 { transform: translate(5px, -5px); }
  .algo-offset-2 { transform: translate(-5px, 5px); }
  .algo-offset-3 { transform: translate(10px, -10px); }
}
```

---

### Phase 6: Brutal Interactions

**Goal**: Harsh, immediate feedback

#### Task 6.1: No Smooth Transitions
**File**: `src/styles/global.css`

```css
@layer base {
  * {
    transition: none !important;
    animation: none !important;
  }
  
  /* Instant state changes */
  button:hover,
  a:hover {
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 black;
  }
  
  button:active,
  a:active {
    transform: translate(0, 0);
    box-shadow: none;
  }
}
```

#### Task 6.2: Visible Focus States
**File**: `src/styles/global.css`

```css
@layer base {
  *:focus-visible {
    outline: 4px solid var(--accent);
    outline-offset: 4px;
    background: var(--highlight);
  }
  
  a:focus-visible {
    text-decoration: underline wavy;
    text-decoration-thickness: 3px;
  }
}
```

---

### Phase 7: Section Styling

**Goal**: Exposed, boxed sections with visible structure

#### Task 7.1: Featured Posts Section
**File**: `src/pages/index.astro`

```astro
<section id="featured" class="brutal-section">
  <div class="section-header">
    <h2>
      ╔═══════════════════════╗
      <br>║ FEATURED_POSTS      ║
      <br>╚═══════════════════════╝
    </h2>
  </div>
  
  <ul class="brutal-grid">
    {featuredPosts.map((data, index) => (
      <Card variant="h2" {...data} data-index={index} />
    ))}
  </ul>
</section>

<style>
  .brutal-section {
    border: 4px solid black;
    padding: 25px;
    margin: 30px 0;
    background: white;
  }
  
  .section-header h2 {
    font-family: monospace;
    font-size: 24px;
    line-height: 1.3;
    margin-bottom: 20px;
  }
  
  .brutal-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
    padding: 0;
  }
  
  @media (min-width: 768px) {
    .brutal-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
```

---

### Phase 8: Dark Mode Brutalism

**Goal**: Terminal-style dark mode

#### Task 8.1: Terminal Dark Theme
**File**: `src/styles/global.css`

```css
html[data-theme="dark"] {
  --background: #000000;
  --foreground: #00ff00;
  --accent: #00ffff;
  --muted: #003300;
  --border: #00ff00;
  --highlight: #ff00ff;
}

html[data-theme="dark"] body {
  background: #000000;
  color: #00ff00;
  text-shadow: 0 0 2px #00ff00;
}

html[data-theme="dark"] a {
  color: #00ffff;
  text-shadow: 0 0 2px #00ffff;
}

html[data-theme="dark"] a:hover {
  background: #00ff00;
  color: #000000;
  text-shadow: none;
}

html[data-theme="dark"] section {
  border-color: #00ff00;
  background: #001100;
}

html[data-theme="dark"] .brutal-card {
  border-color: #00ff00;
  background: #000000;
}

html[data-theme="dark"] .brutal-card:hover {
  background: #003300;
  box-shadow: 3px 3px 0 #00ff00;
}
```

---

## Complete Style Override

### Master Brutalist Stylesheet
**File**: `src/styles/global.css` (Complete replacement)

```css
@import "tailwindcss";

/* ALGORITHMIC BRUTALISM THEME */

:root,
html[data-theme="light"] {
  --background: #ffffff;
  --foreground: #000000;
  --accent: #0000EE;
  --muted: #cccccc;
  --border: #000000;
  --highlight: #ffff00;
}

html[data-theme="dark"] {
  --background: #000000;
  --foreground: #00ff00;
  --accent: #00ffff;
  --muted: #003300;
  --border: #00ff00;
  --highlight: #ff00ff;
}

@layer base {
  * {
    font-family: 'Courier New', Courier, 'Lucida Console', monospace !important;
    transition: none !important;
    animation: none !important;
  }
  
  html {
    overflow-y: scroll;
  }
  
  body {
    background: var(--background);
    color: var(--foreground);
    font-size: 16px;
    line-height: 1.4;
    min-height: 100vh;
    background-image: 
      repeating-linear-gradient(0deg, transparent, transparent 19px, #e0e0e0 19px, #e0e0e0 20px),
      repeating-linear-gradient(90deg, transparent, transparent 19px, #e0e0e0 19px, #e0e0e0 20px);
    background-size: 20px 20px;
  }
  
  h1 {
    font-size: 72px;
    font-weight: 900;
    line-height: 0.9;
    text-transform: uppercase;
    letter-spacing: -2px;
    margin: 20px 0;
  }
  
  h2 {
    font-size: 48px;
    font-weight: 900;
    line-height: 1;
    text-transform: uppercase;
    margin: 15px 0;
  }
  
  h3 {
    font-size: 32px;
    font-weight: 700;
    line-height: 1.1;
    margin: 10px 0;
  }
  
  a {
    color: var(--accent);
    text-decoration: underline;
  }
  
  a:visited {
    color: #551A8B;
  }
  
  a:hover {
    background: var(--highlight);
    color: var(--foreground);
    transform: translate(-2px, -2px);
    box-shadow: 2px 2px 0 var(--border);
    display: inline-block;
  }
  
  section {
    border: 3px solid var(--border);
    padding: 20px;
    margin: 20px auto;
    max-width: 1200px;
    background: var(--background);
  }
  
  *:focus-visible {
    outline: 4px solid var(--accent);
    outline-offset: 4px;
  }
}

/* Dark mode adjustments */
html[data-theme="dark"] body {
  background-image: 
    repeating-linear-gradient(0deg, transparent, transparent 19px, #1a1a1a 19px, #1a1a1a 20px),
    repeating-linear-gradient(90deg, transparent, transparent 19px, #1a1a1a 19px, #1a1a1a 20px);
  text-shadow: 0 0 2px var(--foreground);
}

html[data-theme="dark"] a {
  text-shadow: 0 0 2px var(--accent);
}

html[data-theme="dark"] section {
  background: #001100;
}
```

---

## Implementation Checklist

### Quick Start (1-2 hours)
- [ ] Replace `src/styles/global.css` with brutalist base
- [ ] Update hero section with ASCII art
- [ ] Add borders to all sections
- [ ] Change all fonts to monospace
- [ ] Implement harsh color scheme

### Full Implementation (4-6 hours)
- [ ] Redesign Card component with brutal styling
- [ ] Add grid background pattern
- [ ] Implement terminal dark mode
- [ ] Add ASCII decorations
- [ ] Remove all smooth transitions
- [ ] Add visible borders everywhere
- [ ] Update section headers with box drawing
- [ ] Implement harsh hover states

### Polish (2-3 hours)
- [ ] Add algorithmic spacing patterns
- [ ] Implement asymmetric offsets
- [ ] Add more ASCII art elements
- [ ] Fine-tune contrast ratios
- [ ] Test keyboard navigation
- [ ] Verify accessibility (still important!)

---

## Key Files to Modify

1. **src/styles/global.css** - Complete style overhaul
2. **src/components/Card.astro** - Brutal card design
3. **src/pages/index.astro** - Hero and sections
4. **src/components/Header.astro** - Brutal navigation
5. **src/components/Footer.astro** - Raw footer

---

## Design Principles Summary

**DO:**
- Use monospace fonts exclusively
- Show borders and structure
- Use harsh, instant transitions
- Embrace asymmetry
- Use ASCII art and symbols
- Keep high contrast
- Make grids visible
- Use system colors

**DON'T:**
- Use smooth animations
- Hide structure
- Use rounded corners (or use extreme)
- Use subtle colors
- Use images (unless necessary)
- Use gradients (unless harsh)
- Polish too much
- Make it "pretty"

---

**Plan Version**: 1.0  
**Style**: Algorithmic Brutalism  
**Estimated Time**: 6-10 hours total  
**Difficulty**: Medium (conceptually simple, execution requires boldness)