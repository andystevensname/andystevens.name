<template>
    <article class="px-4 relative h-full">
      <h1 class="w-full text-5xl mb-6 text-center">Blog</h1>
      <ContentList path="/blog/tags" :query="{
        only: ['tags'],
      }">
        <!-- Default list slot -->
        <template v-slot="{ list }">
          <PostCard v-for="article in list" :key="article._path" :post="article" />
        </template>
  
        <template #not-found>
          <p>No tags found.</p>
        </template>
      </ContentList>
    </article>
  </template>
  
  <script setup>
  // set meta for page
  useHead({
    title: "Blog Tags",
    meta: [
      {
        name: "description",
        content: "A listing of various tags used on the blog.",
      },
    ],
  });
  </script>
  