---
date: 2026-03-24T08:24:02.239Z
title: Moving to Astro (with AI doing the heavy lifting)
category:
  - website
  - ai
published: false
---

I never really felt at home with [Nuxt.js](https://nuxt.com). I moved the site over to Nuxt some years back, it was the latest and greatest and I wanted to use Vue and take advantage of server-side rendering. But it felt like the documentation didn't have everything I needed at the time, and the process of porting the site to a new framework left me feeling uncreative and stifled. For me, building sites has always felt more special than filling them with content, but I _did_ want to get to the point where I filled it with content. Burning out before I began was problematic.

Recently I felt the itch again to build things, so what did I do? I decided to change frameworks, naturally. Except, this time around I had AI.

Say what you will about coders and AI-slop, but porting code between frameworks is actually a great use case for generative AI. I used Claude Code, the star of the scene right now. It wasn't perfect. If I didn't have an understanding of what it was doing behind the scenes, I probably wouldn't have got very far. And I'm sure there are some spots where the code could be improved currently. But I've been able to keep things pretty lean.

As of today, the site currently gets 100% on PageSpeed Insights on both mobile and desktop, which to be frank, is what a page of this nature should accomplish. It's mostly text and very little JavaScript. [Astro](https://astro.build) does a great job rendering vanilla JavaScript, and with the help of some added support from modern browsers I was able to drop the animation library I used to animate the website on Desktop and Tablet views. While Tailwind is cool and a great tool for larger, more complex websites with thousands of UI elements, I've transitioned back to hand-rolled CSS, taking a serious bloat out of the website.
