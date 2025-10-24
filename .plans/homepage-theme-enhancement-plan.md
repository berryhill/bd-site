# Blog Homepage Theme Enhancement Plan

**Project**: berryhill.dev Theme Modernization  
**Date**: 2025-10-24  
**Focus**: Major theme enhancements for homepage  
**Scope**: Visual design, colors, typography, spacing - NO testing, NO docs

---

## Research Summary: 2024-2025 Design Trends

### Typography Trends
**From Creative Bloq, Design Shack, Envato:**
- **Bold, oversized headings** - Making statements with large type
- **Variable fonts** - Dynamic, responsive typography
- **High contrast** - Strong differentiation between heading and body text
- **Custom font pairings** - Mixing serif + sans-serif for personality
- **Generous line height** - 1.6-1.8 for better readability
- **Kinetic typography** - Subtle animations on scroll

### Color Trends 2025
**From Looka, The Creative Accent:**
- **Warm neutrals** - Beige, cream, warm grays replacing stark whites
- **Deep, rich darks** - Navy, charcoal instead of pure black
- **Vibrant accents** - Bold, saturated accent colors (coral, electric blue, emerald)
- **Gradient overlays** - Subtle gradients for depth
- **High contrast pairings** - Bold color combinations
- **Muted pastels** - Soft, sophisticated color palettes

### Dark Mode Best Practices
**From Wanderland Agency, Algoworks, Uxcel:**
- **True black avoided** - Use dark grays (#1a1a1a, #212737)
- **Reduced contrast** - Not pure white on black (use #e0e0e0)
- **Accent color adjustment** - Brighter, more saturated in dark mode
- **Layered backgrounds** - Subtle elevation with different shades
- **Warm tones** - Slightly warm grays prevent eye strain
- **Consistent spacing** - Same layout in both modes

### Minimalist Blog Design 2025
**From Marketer Milk, Webstacks, Colorlib:**
- **Generous white space** - Breathing room around content
- **Bold typography hierarchy** - Clear visual levels
- **Limited color palette** - 2-3 colors max
- **Clean grid systems** - Structured, organized layouts
- **Subtle shadows** - Depth without clutter
- **Micro-interactions** - Hover states, smooth transitions
- **Focus on content** - Design supports, doesn't distract

### Tech Blog Aesthetics
**From DesignRush, TiTech:**
- **Monospace fonts** - Code-friendly, technical feel
- **Geometric shapes** - Clean lines, modern feel
- **Gradient accents** - Subtle tech-forward touches
- **Card-based layouts** - Organized, scannable
- **Smooth animations** - Professional, polished
- **High readability** - Content-first approach

---

## Current Theme Analysis

### Current Color Scheme
```css
/* Light Mode */
--background: #fdfdfd (almost white)
--foreground: #282728 (dark gray)
--accent: #006cac (blue)
--muted: #e6e6e6 (light gray)
--border: #ece9e9 (very light gray)

/* Dark Mode */
--background: #212737 (dark blue-gray) ✓ Good
--foreground: #eaedf3 (light blue-gray) ✓ Good
--accent: #ff6b01 (orange) ✓ Good
--muted: #343f60 (muted blue)
--border: #ab4b08 (dark orange)
```

### Current Typography
- **Font**: Monospace (font-mono)
- **Max width**: 3xl (48rem)
- **Line height**: Default Tailwind
- **Heading sizes**: text-2xl, text-3xl

### Strengths
✓ Dark mode already implemented well
✓ Monospace font fits tech blog aesthetic
✓ Clean, minimal foundation
✓ Good color contrast

### Opportunities
⚠️ Light mode feels stark (pure white background)
⚠️ Accent colors could be more vibrant
⚠️ Typography hierarchy could be stronger
⚠️ Limited use of depth/shadows
⚠️ No gradient accents
⚠️ Spacing could be more generous
⚠️ No hover animations/micro-interactions

---

## Theme Enhancement Strategy

### Design Philosophy
**Modern Minimalist Tech Blog**
- Clean, spacious, professional
- Strong typography hierarchy
- Vibrant but tasteful accents
- Smooth, subtle interactions
- Content-first approach
- Tech-forward aesthetic

### Color Palette Modernization

#### Enhanced Light Mode
```css
--background: #fafaf9 (warm off-white, not stark)
--foreground: #1a1a1a (true dark, better contrast)
--accent: #0066ff (vibrant blue, more modern)
--accent-hover: #0052cc (darker on hover)
--muted: #f5f5f4 (subtle warm gray)
--border: #e7e5e4 (warm border)
--card-bg: #ffffff (pure white for cards)
--shadow: rgba(0, 0, 0, 0.05) (subtle shadows)
```

#### Enhanced Dark Mode
```css
--background: #0a0a0a (deeper, richer black)
--foreground: #e5e5e5 (softer white, less harsh)
--accent: #3b82f6 (brighter blue for dark mode)
--accent-hover: #60a5fa (lighter on hover)
--muted: #1f1f1f (layered dark)
--border: #2a2a2a (subtle borders)
--card-bg: #141414 (elevated cards)
--shadow: rgba(0, 0, 0, 0.3) (deeper shadows)
```

#### Gradient Accents (New)
```css
--gradient-primary: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%)
--gradient-secondary: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
--gradient-subtle: linear-gradient(180deg, transparent 0%, rgba(0,102,255,0.05) 100%)
```

### Typography Enhancements

#### Font Stack
```css
/* Keep monospace for code feel, but add fallbacks */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace
--font-sans: 'Inter', -apple-system, system-ui, sans-serif (for headings)
```

#### Type Scale (Fluid Typography)
```css
/* Headings - Use sans-serif for contrast */
--text-hero: clamp(2.5rem, 5vw, 4rem) /* 40-64px */
--text-h1: clamp(2rem, 4vw, 3rem) /* 32-48px */
--text-h2: clamp(1.5rem, 3vw, 2rem) /* 24-32px */
--text-h3: clamp(1.25rem, 2.5vw, 1.5rem) /* 20-24px */

/* Body - Keep monospace */
--text-base: clamp(0.875rem, 1.5vw, 1rem) /* 14-16px */
--text-lg: clamp(1rem, 2vw, 1.125rem) /* 16-18px */
--text-sm: 0.875rem /* 14px */

/* Line Heights */
--leading-tight: 1.2
--leading-normal: 1.6
--leading-relaxed: 1.8
```

### Spacing System

#### Generous Spacing
```css
/* Section spacing */
--space-section: clamp(4rem, 8vw, 8rem) /* 64-128px */
--space-section-sm: clamp(3rem, 6vw, 6rem) /* 48-96px */

/* Component spacing */
--space-card: clamp(1.5rem, 3vw, 2rem) /* 24-32px */
--space-element: clamp(1rem, 2vw, 1.5rem) /* 16-24px */

/* Grid gaps */
--gap-grid: clamp(1.5rem, 3vw, 2.5rem) /* 24-40px */
```

### Visual Effects

#### Shadows (Layered Depth)
```css
/* Light mode */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.04)

/* Dark mode */
--shadow-sm-dark: 0 1px 2px rgba(0, 0, 0, 0.3)
--shadow-md-dark: 0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)
--shadow-lg-dark: 0 10px 15px rgba(0, 0, 0, 0.5), 0 4px 6px rgba(0, 0, 0, 0.3)
```

#### Border Radius
```css
--radius-sm: 0.375rem /* 6px */
--radius-md: 0.5rem /* 8px */
--radius-lg: 0.75rem /* 12px */
--radius-xl: 1rem /* 16px */
```

#### Transitions
```css
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Implementation Plan

### Phase 1: Color System Overhaul

#### Task 1.1: Update CSS Variables
**File**: `src/styles/global.css`

```css
:root,
html[data-theme="light"] {
  /* Backgrounds */
  --background: #fafaf9;
  --card-bg: #ffffff;
  --muted-bg: #f5f5f4;
  
  /* Foregrounds */
  --foreground: #1a1a1a;
  --foreground-muted: #525252;
  
  /* Accents */
  --accent: #0066ff;
  --accent-hover: #0052cc;
  --accent-light: #e6f0ff;
  
  /* Borders */
  --border: #e7e5e4;
  --border-strong: #d6d3d1;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #0066ff 0%, #00d4ff 100%);
  --gradient-subtle: linear-gradient(180deg, transparent 0%, rgba(0,102,255,0.03) 100%);
}

html[data-theme="dark"] {
  /* Backgrounds */
  --background: #0a0a0a;
  --card-bg: #141414;
  --muted-bg: #1f1f1f;
  
  /* Foregrounds */
  --foreground: #e5e5e5;
  --foreground-muted: #a3a3a3;
  
  /* Accents */
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --accent-light: #1e3a8a;
  
  /* Borders */
  --border: #2a2a2a;
  --border-strong: #404040;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5), 0 4px 6px rgba(0, 0, 0, 0.3);
  
  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  --gradient-subtle: linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.05) 100%);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-foreground-muted: var(--foreground-muted);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-light: var(--accent-light);
  --color-muted-bg: var(--muted-bg);
  --color-card-bg: var(--card-bg);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
}
```

#### Task 1.2: Add Utility Classes
**File**: `src/styles/global.css`

```css
@layer utilities {
  /* Gradient backgrounds */
  .bg-gradient-primary {
    background: var(--gradient-primary);
  }
  
  .bg-gradient-subtle {
    background: var(--gradient-subtle);
  }
  
  /* Shadow utilities */
  .shadow-card {
    box-shadow: var(--shadow-md);
  }
  
  .shadow-card-hover {
    box-shadow: var(--shadow-lg);
  }
  
  /* Glass morphism effect */
  .glass {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  
  .dark .glass {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
```

---

### Phase 2: Typography Enhancement

#### Task 2.1: Update Base Typography
**File**: `src/styles/global.css`

```css
@layer base {
  body {
    @apply flex min-h-svh flex-col bg-background font-mono text-foreground;
    @apply selection:bg-accent/20 selection:text-foreground;
    line-height: 1.6;
    font-size: clamp(0.875rem, 1.5vw, 1rem);
  }
  
  /* Headings use sans-serif for contrast */
  h1, h2, h3, h4, h5, h6 {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  
  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
  }
  
  h2 {
    font-size: clamp(1.5rem, 3vw, 2rem);
  }
  
  h3 {
    font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  }
  
  /* Improved link styles */
  a {
    @apply text-accent transition-colors duration-200;
    text-decoration: none;
  }
  
  a:hover {
    @apply text-accent-hover;
  }
  
  /* Better paragraph spacing */
  p {
    line-height: 1.7;
    margin-bottom: 1rem;
  }
  
  p:last-child {
    margin-bottom: 0;
  }
}
```

#### Task 2.2: Enhanced Typography Utilities
**File**: `src/styles/typography.css`

```css
/* Hero text styles */
.text-hero {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Section headings */
.heading-section {
  font-size: clamp(1.75rem, 3.5vw, 2.5rem);
  font-weight: 700;
  margin-bottom: 2rem;
  position: relative;
  padding-bottom: 0.75rem;
}

.heading-section::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 3rem;
  height: 0.25rem;
  background: var(--gradient-primary);
  border-radius: 2px;
}

/* Emphasized text */
.text-emphasis {
  font-size: clamp(1rem, 2vw, 1.125rem);
  line-height: 1.7;
  color: var(--foreground-muted);
}

/* Code-style accent */
.text-code-accent {
  font-family: var(--font-mono);
  background: var(--accent-light);
  color: var(--accent);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}
```

---

### Phase 3: Component Styling

#### Task 3.1: Enhanced Card Component
**File**: `src/components/Card.astro`

```astro
<li class="group relative">
  <div class="card-wrapper h-full rounded-xl border border-border bg-card-bg p-6 
              transition-all duration-300 hover:shadow-card-hover hover:border-accent/30
              hover:-translate-y-1">
    
    <!-- Gradient overlay on hover -->
    <div class="absolute inset-0 rounded-xl bg-gradient-subtle opacity-0 
                group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    
    <!-- Content -->
    <div class="relative z-10">
      <a href={getPath(id, filePath)} 
         class="block mb-3 group-hover:text-accent transition-colors duration-200">
        {variant === "h2" ? (
          <h2 class="text-2xl font-bold leading-tight">{title}</h2>
        ) : (
          <h3 class="text-xl font-bold leading-tight">{title}</h3>
        )}
      </a>
      
      <Datetime {pubDatetime} {modDatetime} {timezone} 
                class="text-sm text-foreground-muted mb-3" />
      
      <p class="text-foreground-muted leading-relaxed">{description}</p>
    </div>
    
    <!-- Accent line at bottom -->
    <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-primary 
                opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                rounded-b-xl"></div>
  </div>
</li>
```

#### Task 3.2: Hero Section Styling
**File**: `src/pages/index.astro`

```astro
<section id="hero" class="relative py-20 md:py-28">
  <!-- Background gradient -->
  <div class="absolute inset-0 bg-gradient-subtle pointer-events-none"></div>
  
  <div class="relative z-10">
    <!-- RSS link with better styling -->
    <a href="/rss.xml" 
       class="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full 
              bg-accent/10 text-accent hover:bg-accent/20 transition-all duration-200
              border border-accent/20 hover:border-accent/40">
      <IconRss width={16} height={16} />
      <span class="text-sm font-medium">RSS Feed</span>
    </a>
    
    <!-- Hero heading with gradient -->
    <h1 class="text-hero mb-6">
      Welcome to berryhill.dev
    </h1>
    
    <!-- Intro text with better hierarchy -->
    <p class="text-emphasis mb-4 max-w-2xl">
      Welcome to my corner of the internet where I explore agentic-first development,
      AI/ML systems, Web3 smart contracts, and intelligent automation.
    </p>
    
    <p class="text-base text-foreground-muted max-w-2xl leading-relaxed">
      Dive into practical insights on AI agents, blockchain development, modern web
      applications, and the future of autonomous systems.
    </p>
    
    <!-- Social links with better spacing -->
    {SOCIALS.length > 0 && (
      <div class="mt-8 flex items-center gap-4">
        <span class="text-sm text-foreground-muted">Connect:</span>
        <Socials />
      </div>
    )}
  </div>
</section>
```

#### Task 3.3: Section Headings
**File**: `src/pages/index.astro`

```astro
<!-- Featured section -->
<section id="featured" class="py-16">
  <h2 class="heading-section">Featured Posts</h2>
  <ul class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
    {featuredPosts.map(data => (
      <Card variant="h2" {...data} />
    ))}
  </ul>
</section>

<!-- Recent posts section -->
<section id="recent-posts" class="py-16">
  <h2 class="heading-section">Recent Posts</h2>
  <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {recentPosts.map((data, index) =>
      index < SITE.postPerIndex && <Card variant="h3" {...data} />
    )}
  </ul>
</section>
```

#### Task 3.4: CTA Button Enhancement
**File**: `src/components/LinkButton.astro`

```astro
<a 
  href={href}
  class="inline-flex items-center gap-2 px-8 py-4 rounded-xl
         bg-gradient-primary text-white font-semibold
         shadow-md hover:shadow-xl
         transform hover:-translate-y-0.5
         transition-all duration-300
         border-0 outline-offset-2"
  {...props}
>
  <slot />
</a>
```

---

### Phase 4: Micro-Interactions

#### Task 4.1: Smooth Scroll Animations
**File**: `src/styles/global.css`

```css
@layer utilities {
  /* Fade in on scroll */
  .fade-in {
    opacity: 0;
    transform: translateY(20px);
    animation: fadeInUp 0.6s ease-out forwards;
  }
  
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  /* Stagger animation delays */
  .fade-in:nth-child(1) { animation-delay: 0.1s; }
  .fade-in:nth-child(2) { animation-delay: 0.2s; }
  .fade-in:nth-child(3) { animation-delay: 0.3s; }
  .fade-in:nth-child(4) { animation-delay: 0.4s; }
  .fade-in:nth-child(5) { animation-delay: 0.5s; }
  .fade-in:nth-child(6) { animation-delay: 0.6s; }
}
```

#### Task 4.2: Hover Effects
**File**: `src/styles/global.css`

```css
@layer components {
  /* Interactive elements */
  .interactive {
    @apply transition-all duration-200 ease-out;
  }
  
  .interactive:hover {
    @apply scale-105;
  }
  
  .interactive:active {
    @apply scale-95;
  }
  
  /* Glow effect on hover */
  .glow-on-hover {
    position: relative;
  }
  
  .glow-on-hover::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    background: var(--gradient-primary);
    opacity: 0;
    transition: opacity 0.3s;
    z-index: -1;
    filter: blur(8px);
  }
  
  .glow-on-hover:hover::before {
    opacity: 0.5;
  }
}
```

#### Task 4.3: Loading States
**File**: `src/styles/global.css`

```css
@layer utilities {
  /* Skeleton loading */
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--muted-bg) 0%,
      var(--card-bg) 50%,
      var(--muted-bg) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  /* Pulse animation */
  .pulse-slow {
    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
}
```

---

### Phase 5: Spacing & Layout Refinement

#### Task 5.1: Update Section Spacing
**File**: `src/styles/global.css`

```css
@layer base {
  section {
    @apply mx-auto max-w-app px-4;
    padding-top: clamp(3rem, 6vw, 6rem);
    padding-bottom: clamp(3rem, 6vw, 6rem);
  }
  
  /* First section less top padding */
  section:first-of-type {
    padding-top: clamp(2rem, 4vw, 4rem);
  }
  
  /* Tighter spacing between related sections */
  section + section {
    padding-top: clamp(2rem, 4vw, 4rem);
  }
}
```

#### Task 5.2: Grid System Enhancement
**File**: `src/styles/global.css`

```css
@layer utilities {
  /* Responsive grid with auto-fit */
  .grid-auto-fit {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
    gap: clamp(1.5rem, 3vw, 2.5rem);
  }
  
  /* Featured grid (larger cards) */
  .grid-featured {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr));
    gap: clamp(2rem, 4vw, 3rem);
  }
}
```

#### Task 5.3: Container Improvements
**File**: `src/styles/global.css`

```css
@utility max-w-app {
  @apply max-w-6xl; /* Increased from 3xl for more breathing room */
}

@layer utilities {
  /* Content containers */
  .container-narrow {
    @apply max-w-3xl mx-auto px-4;
  }
  
  .container-wide {
    @apply max-w-7xl mx-auto px-4;
  }
  
  /* Full bleed sections */
  .full-bleed {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);
  }
}
```

---

### Phase 6: Dark Mode Refinements

#### Task 6.1: Improved Dark Mode Transitions
**File**: `src/styles/global.css`

```css
@layer base {
  * {
    @apply transition-colors duration-200;
  }
  
  /* Smooth theme transitions */
  html[data-theme] {
    transition: background-color 0.3s ease, color 0.3s ease;
  }
  
  /* Prevent flash of unstyled content */
  html:not([data-theme]) {
    visibility: hidden;
  }
  
  html[data-theme] {
    visibility: visible;
  }
}
```

#### Task 6.2: Dark Mode Specific Adjustments
**File**: `src/styles/global.css`

```css
@layer utilities {
  /* Reduce image brightness in dark mode */
  .dark img {
    opacity: 0.9;
  }
  
  .dark img:hover {
    opacity: 1;
  }
  
  /* Adjust borders in dark mode */
  .dark .border {
    border-color: var(--border);
  }
  
  /* Softer shadows in dark mode */
  .dark .shadow-card {
    box-shadow: var(--shadow-md-dark);
  }
  
  .dark .shadow-card-hover {
    box-shadow: var(--shadow-lg-dark);
  }
}
```

---

## Visual Design System Summary

### Color Palette
```
Light Mode:
├── Background: #fafaf9 (warm off-white)
├── Card: #ffffff (pure white)
├── Text: #1a1a1a (rich black)
├── Accent: #0066ff (vibrant blue)
└── Muted: #f5f5f4 (warm gray)

Dark Mode:
├── Background: #0a0a0a (deep black)
├── Card: #141414 (elevated)
├── Text: #e5e5e5 (soft white)
├── Accent: #3b82f6 (bright blue)
└── Muted: #1f1f1f (layered dark)
```

### Typography Scale
```
Hero: 40-64px (fluid)
H1: 32-48px (fluid)
H2: 24-32px (fluid)
H3: 20-24px (fluid)
Body: 14-16px (fluid)
Small: 14px (fixed)
```

### Spacing Scale
```
Section: 48-96px (fluid)
Card: 24-32px (fluid)
Element: 16-24px (fluid)
Grid Gap: 24-40px (