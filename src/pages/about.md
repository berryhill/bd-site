---
layout: ../layouts/AboutLayout.astro
title: "About"
---

<div class="about-hero">
  <div class="about-intro">
    <p class="intro-text">
      <span class="drop-cap">M</span>att Berryhill is an agentic-first digital builder focused on creating intelligent products at the intersection of AI, machine learning, blockchain, crypto, and digital music. Passionate about crafting elegant systems and exploring technical frontiers, he works on how emerging technologies are reshaping the way software—and creators—evolve in an increasingly agentic world.
    </p>
  </div>

  <div class="about-image">
    <div class="image-fade-container">
      <img src="/matt_headshot.jpeg" alt="Matt Berryhill" class="headshot" loading="eager" />
      <img src="/avatar.png" alt="Matt Berryhill Avatar" class="avatar" loading="eager" />
    </div>
  </div>
</div>

## A Little Bit More About Matt (Like Anyone Cares)

Matt is passionate about the cutting edge of software development — from AI-powered systems to the frameworks and tools shaping the next generation of digital products. He's particularly drawn to the intersection of technology, design, and culture — where ideas become systems, and systems become stories.

As an agentic-first digital builder, Matt focuses on creating products and teams that evolve intelligently. He's learned that great teams aren't built overnight — they're living systems that thrive on collaboration, experimentation, and shared purpose. Skill matters, but mindset matters more. Hunger, curiosity, and the ability to think differently are what move teams — and products — forward.

Leadership, for Matt, is about presence, consistency, and momentum. Culture comes from the top but thrives when everyone contributes. He believes the best teams balance autonomy with alignment, reward outcomes over optics, and grow through shared achievement rather than individual heroics.

If you want to talk ideas, projects, or potential collaborations — <a href="https://calendly.com/matt-berryhill/30min" target="_blank" rel="noopener noreferrer">schedule a call</a>.

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
