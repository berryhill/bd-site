---
layout: ../layouts/AboutLayout.astro
title: "About"
description: "Matt Berryhill builds AI-native operating systems, agent workflows, and discovery surfaces that make autonomous work easier to inspect, trust, and improve."
---

<div class="terminal-shell about-terminal-hero">
  <div class="terminal-chrome" aria-hidden="true">
    <span class="terminal-dots">
      <span class="terminal-dot"></span>
      <span class="terminal-dot"></span>
      <span class="terminal-dot"></span>
    </span>
    <span>matt@berryhill: ~/berryhill.dev/about.md</span>
    <span>truthful profile</span>
  </div>
  <div class="terminal-body">
    <p class="terminal-path">cat about.md</p>
    <h1>I build AI-native systems that make autonomous work easier to inspect, trust, and improve.</h1>
    <p class="about-deck">
      Matt Berryhill builds AI-native operating systems: agent workflows, discovery surfaces, review loops, and the governance layer that turns intelligent automation into work people can inspect and trust.
    </p>
    <p class="about-deck">
      I write and build around the layer most AI demos skip: context, ownership, evidence, memory, review, and the human judgment required to turn a promising agent loop into reliable work.
    </p>
    <div class="about-portrait" aria-label="Matt Berryhill portrait assets">
      <img src="/matt_headshot.jpeg" alt="Matt Berryhill" loading="eager" />
      <img src="/avatar.png" alt="Matt Berryhill avatar" loading="lazy" />
    </div>
    <div class="terminal-grid cols-3 about-summary" aria-label="Profile summary">
      <div class="terminal-stat">
        <strong>AI-native</strong>
        <span>systems</span>
      </div>
      <div class="terminal-stat">
        <strong>agentic</strong>
        <span>workflows</span>
      </div>
      <div class="terminal-stat">
        <strong>public</strong>
        <span>operating notes</span>
      </div>
    </div>
  </div>
</div>

<div class="about-grid">
  <aside class="terminal-panel about-toc">
    <p class="terminal-command">grep -n "^##" about.md</p>
    <ol>
      <li><a href="#what-im-building">What I’m building</a></li>
      <li><a href="#current-focus">Current focus</a></li>
      <li><a href="#what-i-believe">What I believe</a></li>
      <li><a href="#how-to-read-this-site">How to read this site</a></li>
      <li><a href="#contact">Contact</a></li>
    </ol>
  </aside>

  <div class="about-body">

## What I’m building

This site is not a normal archive. It is the public surface of an operating system for AI-native work: posts, field notes, diagrams, and experiments that show how agents are actually used, where they break, and what has to exist around them for the work to compound.

The long-term direction is a discovery system: domain watches, evidence snapshots, claims, updates, diagrams, essays, reports, and machine-readable surfaces that let humans and agents understand what changed and why it matters.

## Current focus

- Agentic development loops that close faster and verify better.
- Discovery systems that preserve claims, evidence, updates, and context.
- Governance patterns for handoffs, ownership, escalation, and review.
- AI-native publishing systems where posts, reports, and future books can come from the same living knowledge base.
- Public writing that turns real build work into reusable operating models.

## What I believe

Agents do not remove the need for operators. They move the operator’s job up a level.

The valuable work is no longer just writing the first draft, producing the first patch, or finding the first source. The valuable work is knowing what counts as evidence, what should be preserved, what should be thrown away, when a system has drifted, and when a human needs to take responsibility.

That is the operating layer this site is trying to make visible.

## How to read this site

Start with the posts if you want the public arguments. Follow the field notes if you want the operating lessons. Treat the diagrams and metadata as part of the artifact: they are there to make the work easier to inspect, cite, and revisit.

This is also why the site is terminal-inspired. The shell is not decoration. It is a reminder that the public surface should feel like an interface into a working system, not a brochure about one.

## Contact

If you want to talk about AI-native products, agent operations, governance, discovery systems, or the gap between a promising demo and a reliable workflow, <a href="https://calendly.com/matt-berryhill/30min" target="_blank" rel="noopener noreferrer">schedule a call</a>.

  </div>
</div>

<style>
  .about-terminal-hero {
    margin-bottom: 1.5rem;
  }

  .about-deck {
    max-width: 58rem;
    margin-top: 1rem;
    color: var(--fg-secondary);
    font-size: clamp(1.05rem, 1rem + 0.25vw, 1.25rem);
    line-height: 1.75;
  }

  .about-portrait {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }

  .about-portrait img {
    width: 4rem;
    height: 4rem;
    border: 1px solid var(--terminal-border);
    border-radius: 999px;
    object-fit: cover;
  }

  .about-summary {
    margin-top: 1.25rem;
  }

  .about-grid {
    display: grid;
    gap: 1.25rem;
    margin-top: 1.25rem;
  }

  @media (min-width: 960px) {
    .about-grid {
      grid-template-columns: 17rem minmax(0, 1fr);
      align-items: start;
    }
  }

  .about-toc {
    padding: 1rem;
  }

  @media (min-width: 960px) {
    .about-toc {
      position: sticky;
      top: 6rem;
    }
  }

  .about-toc ol {
    margin: 1rem 0 0;
    padding-left: 1.2rem;
  }

  .about-toc li {
    margin: 0.45rem 0;
    color: var(--terminal-muted);
    font-size: 0.92rem;
  }

  .about-body {
    min-width: 0;
  }
</style>
