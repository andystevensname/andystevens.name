<template>
  <article class="px-4 relative h-full table">
    <h1 class="w-full text-5xl mb-6 text-center">
      Posts Tagged with '{{ slug }}'
    </h1>
    <ContentList
      path="/blog"
      :query="{
        only: ['title', 'description', 'tags', 'date', '_path', 'img'],
        where: {
          tags: {
            $contains: filter,
          },
        },
        $sensitivity: 'base',
      }"
    >
      <template v-slot="{ list }">
        <PostCard v-for="post in list" :key="[post]._path" :post="post" />
      </template>
    </ContentList>
  </article>
</template>
<script setup>
// get current route slug
const {
  params: { slug },
} = useRoute();

// get array of filters by generating array from separating slug`,`
const filter = slug.split(",");

useHead({
  title: `All post with ${slug}`,
  meta: [
    {
      name: "description",
      content: `Posts tagged with ${slug}`,
    },
  ],
});
</script>
