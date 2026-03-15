<template>
  <article class="px-4 relative h-full table">
    <h1 class="w-full text-5xl mb-6 text-center">
      Posts Tagged with '{{ slug }}'
    </h1>
    <template v-if="posts && posts.length">
      <PostCard v-for="post in posts" :key="post.path" :post="post" />
    </template>
    <template v-else>
      <p>No articles found.</p>
    </template>
  </article>
</template>

<script setup>
import { useRoute } from 'vue-router'
const { params: { slug: rawSlug } } = useRoute()
const slug = String(rawSlug).replace(/[^a-z0-9-]/gi, '')

const { data: allPosts } = await useAsyncData('blog-tag-' + slug, () =>
  queryCollection('content').where('path', 'LIKE', '/blog/%').all()
)

const posts = computed(() =>
  (allPosts.value || []).filter(p => p.meta?.tags?.includes(slug))
)

useHead({
  title: `All posts with ${slug}`,
  meta: [
    {
      name: 'description',
      content: `Posts tagged with ${slug}`,
    },
  ],
})
</script>
