<template>
  <Layout>
    <article class="px-4 relative">
      <h1 class="w-full text-5xl mb-6 text-center">About</h1>
      <h2>The Basics</h2>
      <p>Andy Stevens is a documentarian by day, and a poet, web developer, and tinkerer by night. Andy holds a B.A. in Creative Writing from Eckerd College in St. Petersburg, FL, and an M.F.A in Creative Writing from University of Tampa.</p>
      <p>His poetry and writing have been published in a few places, but the internet being what it is, not all of it still exists. He is currently working on his first book-length collection. If you're a friend or family member, or an editor, and would like an advanced copy of the collection-in-progress, please reach out.</p>

      <h2> Social Media</h2>
      <p>Andy can be reached on th following social media platforms:</p>
      <ul>
        <li>Twitter: <a href="https://twitter.com/andystevensname">@andystevensname</a></li>
      </ul>

      <h2>Colophon</h2>
      <p>This website using the <a href="https://gridsome.org/">Gridsome</a> static site generator, which uses the <a href="https://vuejs.org">Vue.js framework</a>.</p>
      <p>The animation on the front page is powered by <a href="https://two.js.org/">two.js</a>, an SVG animation library.</p>
      <p>This site's code is available on <a href="https://github.com/andystevensname/andystevens.name">GitHub</a>, and the website itself is hosted for free on <a href="https://www.netlify.com/">Netlify</a>.</p>
    </article>
  </Layout>
</template>

<script>
export default {
  metaInfo: {
    title: 'About',
    meta: [
      {
        name: 'description',
        content: 'About Andy Stevens, contact information, and website information.'
      }
    ]
  }
}
</script>