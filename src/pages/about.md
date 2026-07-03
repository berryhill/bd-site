---
layout: ../layouts/AboutLayout.astro
title: "About"
description: "Matt Berryhill is an agentic-first builder focused on AI-native systems, agent workflows, governance, provenance, and the operating discipline required to turn intelligent automation into shipped work."
---

<div class="about-hero">
  <div class="about-intro">
    <p class="intro-text">
      <span class="drop-cap">M</span>att Berryhill is an agentic-first builder focused on the operating layer of AI-native systems.
    </p>
  </div>

  <div class="about-image">
    <div class="image-fade-container">
      <img src="/matt_headshot.jpeg" alt="Matt Berryhill" class="headshot" loading="eager" />
      <img src="/avatar.png" alt="Matt Berryhill Avatar" class="avatar" loading="eager" />
    </div>
  </div>
</div>

## The Work

He works where intelligent products, agent workflows, governance, and technical culture meet: the place where ideas stop being demos and start becoming systems people can review, trust, and ship.

Berryhill.dev is where Matt writes through that work in public. The through-line is not that every tool is new. The through-line is that agentic systems need operating discipline: authority, provenance, review, handoffs, memory, escalation, and proof that the work actually landed.

Matt thinks about products and teams as living systems. Skill matters, but mindset matters more: hunger, curiosity, consistency, and the ability to notice where the workflow is lying to you. The best teams balance autonomy with alignment, reward outcomes over optics, and make progress visible enough to inspect.

If you want to talk about AI-native products, agent operations, governance, discovery systems, or the gap between a promising demo and a reliable workflow, <a href="https://calendly.com/matt-berryhill/30min" target="_blank" rel="noopener noreferrer">schedule a call</a>.

<style>
  .about-hero {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 3rem;
    align-items: start;
    margin-bottom: 3rem;
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
