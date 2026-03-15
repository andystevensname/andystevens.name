<template>
  <main>
    <article class="px-4 relative h-full table">
      <template v-if="doc">
        <h1 class="w-full text-5xl mb-6 text-center">{{ doc.title }}</h1>
        <ContentRenderer :value="doc" />
        <PostMeta :post="doc" />
      </template>
      <template v-else>
        <p>No content found.</p>
      </template>
    </article>
  </main>
</template>

<script setup>
import { useRoute } from 'vue-router'
const route = useRoute()

const { data: doc } = await useAsyncData(route.fullPath, () =>
  queryCollection('content').path(route.fullPath).first()
)

useHead({
  title: doc.value?.title || 'Post',
  meta: [
    { name: 'description', content: doc.value?.description || '' },
  ],
})
</script>
