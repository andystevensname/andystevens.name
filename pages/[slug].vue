<template>
  <main>
    <article class="px-4 relative h-full table">
      <h1 class="w-full text-5xl mb-6 text-center">{{ data.post.title }}</h1>
      <ContentRenderer :value="data.post">
        <template #empty>
            <p>No content found.</p>
        </template>
      </ContentRenderer>
    </article>
  </main>
</template>

<script setup>
  const path = useRoute();
  const { data } = await useAsyncData(`content-/${path.params.slug}/`, async () => {
    let post = queryContent(path.params.slug).findOne();
    return {
      post: await post
    };
  });

  // set the meta
  useHead({
    title: data.value.post.title,
    meta: [
      { 
        name: "description",
        content: data.value.post.description 
      }
    ]
  });
</script>
