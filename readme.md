# [andystevens.name](http://andystevens.name)

The personal homepage of Andy Stevens.

## Dependenices

- Tested with Node.js 24.0.0. This repo includes an [mise.toml](https://mise.jdx.dev).
- Astro 5.18.1

## Installation

```
git clone git@github.com:andystevensname/andystevens.name.git
cd andystevens.name
npm install
```

To run locally, use `npm run dev`. This starts the Astro dev server as a
background daemon (`astro dev --background`), so it is detached from the
terminal and cannot be suspended by shell job control. Follow output with
`npm run dev:logs` and shut it down with `npm run dev:stop`. Use
`npm run dev:fg` if you want the old foreground/TTY-attached behaviour.