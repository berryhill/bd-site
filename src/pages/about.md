---
layout: ../layouts/AboutLayout.astro
title: "About"
description: "Matt Berryhill builds AI-native operating systems, agent workflows, and discovery surfaces that make autonomous work easier to inspect, trust, and improve."
---

<div class="about-hero">
  <div class="about-intro about-terminal terminal-shell">
    <p class="terminal-path">cat ~/berryhill.dev/about.md</p>
    <p class="intro-text">
      <span class="drop-cap">M</span>att Berryhill builds AI-native operating systems: agent workflows, discovery surfaces, review loops, and the governance layer that turns intelligent automation into work people can inspect and trust.
    </p>
  </div>

  <div class="about-image">
    <div class="image-fade-container">
      <img src="/matt_headshot.jpeg" alt="Matt Berryhill" class="headshot" loading="eager" />
      <img src="/avatar.png" alt="Matt Berryhill Avatar" class="avatar" loading="eager" />
    </div>
  </div>
</div>

## What I’m building

This site is not a normal archive. It is the public surface of an operating system for AI-native work: posts, field notes, diagrams, and experiments that show how agents are actually used, where they break, and what has to exist around them for the work to compound.

## Current focus

- Agentic development loops that close faster and verify better.
- Discovery systems that preserve claims, evidence, updates, and context.
- Governance patterns for handoffs, ownership, escalation, and review.
- Public writing that turns real build work into reusable operating models.

## How to read this site

Start with the posts if you want the public arguments. Follow the field notes if you want the operating lessons. Treat the diagrams and metadata as part of the artifact: they are there to make the work easier to inspect, cite, and revisit.

If you want to talk about AI-native products, agent operations, governance, discovery systems, or the gap between a promising demo and a reliable workflow, <a href="https://calendly.com/matt-berryhill/30min" target="_blank" rel="noopener noreferrer">schedule a call</a>.

<style>
  .about-hero {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 3rem;
    align-items: start;
    margin-bottom: 3rem;
  }

  .about-terminal {
    padding: 1.25rem;
  }

  @media (max-width: 768px) {
    .about-hero {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .about-image {
      order: -1;
    }
  }

  .intro-text {
    margin-top: 1rem;
    font-size: 1.125rem;
    line-height: 1.75;
    color: var(--fg-secondary);
  }

  .drop-cap {
    float: left;
    font-size: 3.5rem;
    line-height: 1;
    font-weight: 700;
    margin-right: 0.125rem;
    margin-top: -0.1rem;
    color: var(--foreground);
  }

  .image-fade-container {
    position: relative;
    width: 300px;
    height: 300px;
    margin: 0 auto;
    cursor: pointer;
  }

  .image-fade-container img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    transition: opacity 0.5s ease-in-out;
    border: 3px solid var(--border);
  }

  .headshot {
    opacity: 1;
    z-index: 2;
  }

  .avatar {
    opacity: 0;
    z-index: 1;
  }

  .image-fade-container:hover .headshot {
    opacity: 0;
  }

  .image-fade-container:hover .avatar {
    opacity: 1;
  }
</style>
