<template>
  <article class="px-4 relative h-full">
    <h1 class="w-full text-5xl mb-6 text-center">Tags</h1>
    <template v-if="tags && tags.length">
      <ul>
        <li v-for="tag in tags" :key="tag">
          <NuxtLink :to="`/blog/tags/${tag}`">#{{ tag }}</NuxtLink>
        </li>
      </ul>
    </template>
    <template v-else>
      <p>No tags found.</p>
    </template>
  </article>
</template>

<script setup>
const { data: posts } = await useAsyncData('blog-tags', () =>
  queryCollection('content').where('path', 'LIKE', '/blog/%').all()
)

const tags = computed(() => {
  const all = (posts.value || []).flatMap(p => p.meta?.tags || [])
  return [...new Set(all)].sort()
})

useHead({
  title: 'Blog Tags',
  meta: [
    {
      name: 'description',
      content: 'A listing of various tags used on the blog.',
    },
  ],
})
</script>
