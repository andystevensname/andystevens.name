<template>
  <main>
    <article class="px-4 relative h-full table">
      <h1 class="w-full text-5xl mb-6 text-center">{{ data.post.title }}</h1>
      <ContentRenderer :value="data.post">
        <template #empty>
          <p>No content found.</p>
        </template>
      </ContentRenderer>
      <PostMeta :post="data.post" />
    </article>
  </main>
</template>

<script setup>
const { path } = useRoute();
const { data } = await useAsyncData(`content-${path}`, async () => {
  let post = queryContent().where({ _path: path }).findOne();
  return {
    post: await post,
  };
});

useHead({
  title: data.value.post.title,
  meta: [
    { name: "description", content: data.value.post.description },
    {
      hid: "og:image",
      property: "og:image",
      content: `https://site.com/${data.value.post.img}`,
    },
  ],
});
</script>
