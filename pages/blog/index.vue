<template>
  <article class="px-4 relative h-full">
    <h1 class="w-full text-5xl mb-6 text-center">Blog</h1>
    <ContentList path="/blog" :query="{
      only: ['title', 'description', 'tags', 'date', '_path', 'img'],
    }">
      <!-- Default list slot -->
      <template v-slot="{ list }">
        <PostCard v-for="article in list" :key="article._path" :post="article" />
      </template>

      <template #not-found>
        <p>No articles found.</p>
      </template>
    </ContentList>
  </article>
</template>

<script setup>
// set meta for page
useHead({
  title: "Blog Listing",
  meta: [
    {
      name: "description",
      content: "A listing of all blogs, articles, and missives.",
    },
  ],
});
</script>
