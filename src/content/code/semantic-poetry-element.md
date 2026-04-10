---
title: A Semantic Poetry Element
date: 2026-04-08
published: true
tags: ['poetry','ui','web']
canonical_url: false
description: "I created poem-element (and the markdown plugin to support it) in an attempt to combine all of the best practices for coding and displaying poetry on the web, and to distribute it as a semantic web component."
slug: semantic-poetry-element
projects:
  - project_name: "poem-element"
    code_urls:
      - "https://github.com/andystevensname/poem-element"
      - "https://www.npmjs.com/package/poem-element"
    cli: "npm install poem-element"
    docs: "https://github.com/andystevensname/poem-element"
  - project_name: "remark-poem-element"
    code_urls:
      - "https://github.com/andystevensname/remark-poem-element"
      - "https://www.npmjs.com/package/remark-poem-element"
    cli: "npm install remark-poem-element"
    docs: "https://github.com/andystevensname/remark-poem-element"
---
<aside>

*Note: I made a web component for poems. It's mostly complete. Below is an explanation of why I made it, and some of the design decisions that went into its creation. If you'd rather skip to the good stuff, you can [find the source code and documentation on GitHub](https://github.com/andystevensname/poem-element) or [download it using NPM](https://www.npmjs.com/package/poem-element).*

</aside>

## Why medium and semantics matter

Poem's are molded by their medium. The dimensions of a page or book, whether implied or physical, influence a poem's initial writing in the same way a canvas contains and shapes a painter's vision. Too, where and how a poem is published can significantly alter the poem's final form by imposing additional constraints, in the process adding another layer to the way audiences experience and interperet it.

The web promises a solution to the largest part of this problem, the constraint of physical space, by allowing poems to extend infinitely in any direction. But, accepting that is the whole solution naively assumes freeing the line is the only thing that makes for a good reading experience.

The other thing the web doesn't natively provide is a semantic tag for poetry. Semantic tags play an important role in the web. They not only provide contextual style cues to the browser, they describe website data in ways both humans and computers can understand. So when web developers use the paragraph tag (`<p>`) for poems, or stanzas, or lines of poems, they're forfeiting the ability to differentiate the poem text from standard prose. The preformatted text tag (`<pre>`) comes closer as a design solution--it preserves all of the white space that `<p>` disregards--but it too doesn't do enough to differentiate a poem from other types of preformatted text, like code blocks or scientific data.

[Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) have wide support and allow developers to create their own semantic tags. Under the hood, components are made up of web stuff: HTML, CSS, and JavaScript. If your aim is to beautifully display a singular poem and nothing more, you don't need the added scaffold of web components. But if you're searching for a semantic tag that clearly classifies the text as a poem, that is reusable, accessible, and provides for a high level of design control, the utility of a poem web component becomes clear.

## Introducing poem-element

::project-meta-bar

`<poem-element>` attempts to combine all of the best practices for coding poems on the web:

- It's a fully semantic element, understood by computers and humans.
- It preserves white space natively.
- It's built with responsive design in mind.
- It provides styling control on a per-line basis.
- It provides traditional booksetting options like line numbers and arrows.
- It's accessible to screen readers and other accessibility browsers.
- It comes with default print styles so that it looks good on a physical page.
- It's dependency-less.
- It prioritizes HTML and CSS over JavaScript everywhere it can.

Consider the following poem:

````poem numbers title="Sonnet 43" author="Elizabeth Barrett Browing" numbers-align="right"
How do I love thee? Let me count the ways.
I love thee to the depth and breadth and height
My soul can reach, when feeling out of sight
For the ends of being and ideal grace.
I love thee to the level of every day's
Most quiet need, by sun and candle-light.
I love thee freely, as men strive for right.
I love thee purely, as they turn from praise.
I love thee with the passion put to use
In my old griefs, and with my childhood's faith.
I love thee with a love I seemed to lose
With my lost saints. I love thee with the breath,
Smiles, tears, of all my life; and, if God choose,
I shall but love thee better after death.
````

Nothing crazy, right? I've applied a heavier font weight and italics to the title block, and I've added that border to set it off from the standard page text. But other than those style tweaks, which I've made to my site's own CSS file and not the element's Shadow DOM, it fits in seemlessly with the content on this page. That's the point. 

From a code perspective, the HTML for that poem looks like:

```html
<poem-element numbers numbers-align="right">
  <slot name="title">Sonnet 43</slot>
  <slot name="author">Elizabeth Barrett Brown</slot>
  How do I love thee? Let me count the ways.
  I love thee to the depth and breadth and height
  My soul can reach, when feeling out of sight
  For the ends of being and ideal grace.
  I love thee to the level of every day's
  ...
</poem-element>
````

Other than the optional use of `<slot>` for the title and author, it works exactly like any other HTML text element. As mentioned, the Shadow DOM contains most of the magic, and that looks something like this:

```html
<pre part="block" role="group" aria-label="poem" tabindex="0">
  <span part="line-number" aria-hidden="true">&nbsp;</span>
  <span part="line" role="none">How do I love thee? Let me count the ways.</span>
  <span part="line-number" aria-hidden="true">&nbsp;</span>
  <span part="line" role="none">I love thee to the depth and breadth and height</span>
  <span part="line-number" aria-hidden="true">&nbsp;</span>
  <span part="line" role="none">My soul can reach, when feeling out of sight</span>
  <span part="line-number" aria-hidden="true">&nbsp;</span>
  <span part="line" role="none">For the ends of being and ideal grace.</span>
  <span part="line-number" aria-hidden="true">5.</span>
  <span part="line" role="none">I love thee to the level of every day's</span>
  ...
  <slot name="title"></slot>
  <slot name="author"></slot>
</pre>
```

## Design Considerations

Below are some notes on the design considerations that went into coding the web component.

### Opinionated HTML
- **pre**: in order to fall back gracefully in older browsers that don't support web components, I decided to wrap each poem's text in a `<pre>` tag over a `<div>`. This preserves white space natively, which I think is crucial for all poems.
- **span**: each poem line is wrapped in a span that gives developers some styling control of individual lines. Until CSS provides this mechanism natively, I think this is unavoidable. `<span>` elements were chosen for their spartan default styling and default `display: inline` that degrades gracefully. This feature also enables the CSS `:nth-child()` selector to count lines instead of using JavaScript.

### Unopinionated CSS
- **layouts**: `<poem-element>` supports both gride and list-based layouts.
  - **grid layouts**: CSS grids have reached a 96.37% adoption rate according to [caniuse.com](https://caniuse.com/?search=grid). They're employed when the `numbers` attribute is active on the element so that line numbers can align clearly and consistently with the lines themselves.
  - **list layouts**: because list-item (`<li>`) styling has remained consistent for so long across the web, `<poem-element>` also supports `display: list-item` for left-align line numbers. This layout uses a `::marker` psuedo-element to display the line numbers, and responds well to native list styling.
  - **inside and outside**: taking inspiration from list-item styling, both layouts support line numbers that exist within the text box, and numbers that hang outside the text box in the margin.
- **wrap**: `<poem-element>` defaults to `white-space: pre` to preserve line length and force horizontal scrolling in constrained layouts. I did this because I don't think the element should does assume every poem benefits from line-wrapping. It instead offers attributes that activate a number of different line-wrap variations in order to support responsive web designs.
- **font**: `<poem-element>` does not impose any font style rules, other than resetting the default mono-space font rule for `<pre>` elements. Everything is inherited from the parent element.
- **margin and padding**: `<poem-element>` by default does not impose margin or padding rules. When using line numbers, the element uses some margin, padding, and text-indent to achieve hanging-indents, but this behavior is optional and can be overridden by applying CSS to the element, or through CSS variables.


### Accessibility

- **role**: On the parent `<pre>`, `<poem-element>` sets the `role` to `group` so that browsers know the content is a single entity made up of multiple elements, and it sets `role` on each individual line to `none` so that they are not presented individually to screen readers.
- **aria**: `<poem-element>` sets `aria-label="poem"` on the parent `<pre>` to define it as a poem to accessible browsers, and `arial-hidden="true"` on decorative elements like line numbers so they aren't presented as content to screen readers and other accessibility browsers.
- **continuation arrow**: on wrapping layouts with hanging indents, an optional continuation glyph is available that will denote a wrapped line, helping to distinguish wrapped lines from those that have additional whitespace.
- **keyboard accessibility**: horizontal scroll bars can be controlled with keyboard arrows by making the container `<pre>` focusable.

### Static Site Rendering

`<poem-element>` supports Static Site Rendering and can render the fully-styled poem at build time. To combat the "flash of unstyled content" (FOUC) that plagues some web components, this element wraps the Shadow DOM in a `<template shadowrootmode="open">` tag that helps the browser display content immediately and without JavaScript. The raw poem text is preserved in the light DOM for clients that don't use JavaScript as a fallback, like some users who have it turned off or search engines and RSS feeders that don't read JavaScript.