---
date: 2026-03-24T08:24:02.239Z
title: Moving to Astro (with AI doing the heavy lifting)
tags:
  - website
  - ai
published: true
slug: moving-to-astro-with-ai
description: "I didn't vibe code this website, but I did rely heavily on AI to migrate frameworks"
---

I made the leap to [Astro](https://astro.build) from [Nuxt](https://nuxt.com). I never really felt at home with Nuxt. When I migrated to that framework some years back, I did it not because it was right-sized for this site, but because it came with bells and whistles and knobs I wanted to pull. But the documentation was thin, I wanted to hammer it into a static site generator, and the process of porting the site to a new framework left me feeling stifled. For years, I've written every line of code by hand, and just wiring up the different layouts and components and logic made my head spin. Maybe it was trying to learn Vue when I had never really grasped something like React. For me, building sites has always felt more rewarding than filling them with content, but I _did_ want to get to the point where I filled my site with content. Burning out before I got to that point was the problem.

Recently I felt the itch again to build things, so what did I do? I decided to change frameworks, naturally. Except, this time around I had AI.

Say what you will about coders and AI-slop, but porting code between frameworks is actually a great use case for generative AI. I used [Claude Code](https://claude.ai/new), the current belle of the ball. Of course, it's not perfect. If I didn't have an intuition about what needed to happen at every step and anticipating what it was planning on doing, I probably wouldn't have made it very far. I'm sure there are some spots where the code could be improved. But I've been able to keep things pretty lean by asking questions, debating Claude's decisions, and iterating to optimize. I've actually learned more by asking why Claude proposed changes than I would have by Googling--this is the first project in a while that didn't send me spiraling across Stack Overflow. (Caveat: Claude is probably trained on Stack Overflow). Being able to add whole features through creative writing sped up development time by days or weeks. And I get the push-back on vibe coding, just blindly willing the LLM to predict the right way to do things. But having a tool where I can say, "remove all CSS classes that are unused across the site," or, "standardize all of my link colors," and having confidence in that tool to pull it off, is pretty spectacular and, I think, well worth it.

As for results, I'm currently sitting at 100% on [PageSpeed Insights](https://pagespeed.web.dev) for both mobile and desktop in the Performance, Best Practices, and SEO categories, which to be frank, is what a simple personal site should accomplish with breaking a sweat. That just wasn't possible over the last few years as I carried multiple frameworks and libraries over from version to version. Now, all my JavaScript is vanilla, and only used to control the theme switcher, SVG generation for the animations, and the content filtering on category pages. This update also gave me the opportunity to modernize what I could in HTML. Given the advancement of native browser APIs over the last few years, HTML and CSS can do most of the heavy lifting. Speaking of CSS, Tailwind is cool and great for more complex websites with thousands of UI elements, but I've decided to transitioned back to hand-rolled (well, AI-and-hand-rolled) CSS, dropping many KBs in the process. I imagined AI would trip particularly with CSS, but Claude is surprisingly good at understanding text descriptions and writing CSS to match.

Here is a list of the optimizations I made for page speed and performance:
- Inlined CSS — Astro inlines stylesheets at build, eliminating render-blocking CSS requests
- [Font subsetting](https://the-sustainable.dev/a-guide-to-subsetting-fonts/) — Instrument Serif subset to A-Za-z only (26KB → 10KB)
- [font-display: swap/optional](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display) — prevents font-loading from blocking text render
- Self-hosted fonts — no external requests to Google Fonts
- Static-only output — zero client-side JavaScript framework, no hydration cost.
- [Lazy loading images](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading) — loading="lazy" on feed and album photos
- decoding="async" available for images
- [View Transitions](https://docs.astro.build/en/guides/view-transitions/) — page navigations swap content without full reloads (~3KB runtime)
- Aggressive cache headers — fonts and _astro/ assets cached via Netlify config
- No CSS framework — hand-written CSS, no unused utility classes to ship
- Shiki build-time syntax highlighting — code blocks pre-rendered as HTML, no client-side highlighting library
- [content-visibility: auto](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility) — available for long feed pages to skip rendering off-screen content
- [CSS light-dark()](https://css-tricks.com/almanac/functions/l/light-dark/) — single set of rules instead of duplicated dark mode overrides, reducing CSS size
- Preconnect hints — for external service domains
- prefers-reduced-motion — skips animation entirely, saving CPU on devices that request it

The other big update to this site is support for [IndieWeb](https://indieweb.org) protocols. There are still some kinks to iron out with [WebMentions](https://indieweb.org/Webmention) and [POSSE](https://indieweb.org/POSSE), but I'm sporting all the appropriate meta-data and I've got IndieKit working in the background. Claude made that relatively painless, too, and it didn't get mad when I kept asking what protocols did what. My site gets very little traffic, I doubt I'll be liked or replied to anytime soon, but it's nice to have.

Content-wise, I've migrated my Flickr data here. I just couldn't subscribe for another year of Flickr Pro knowing that I was using it as glorified photo storage. Now my photos are in an Akamai Cloud Object Storage bucket in Jersey.

I've taken up the feed approach to the website, it'll be easier to share what I find interesting without dedicating blog posts to every minor link or nod I want to publish. My guess is, blog posts will remain sporadic while what I'm calling my Commonplace takes form.


