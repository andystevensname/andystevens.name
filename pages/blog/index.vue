<template>
  <article class="px-4 relative h-full">
    <h1 class="w-full text-5xl mb-6 text-center">Blog</h1>
    <template v-if="posts && posts.length">
      <PostCard v-for="post in posts" :key="post.path" :post="post" />
    </template>
    <template v-else>
      <p>No articles found.</p>
    </template>
  </article>
</template>

<script setup>
const { data: posts } = await useAsyncData('blog-list', () =>
  queryCollection('content').where('path', 'LIKE', '/blog/%').all()
)

useHead({
  title: 'Blog Listing',
  meta: [
    {
      name: 'description',
      content: 'A listing of all blogs, articles, and missives.',
    },
  ],
})
</script>
