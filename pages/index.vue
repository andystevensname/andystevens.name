<template>
  <div class="w-full h-full relative">
    <client-only placeholder="loading...">
      <Animation />
    </client-only>
    <div class="text-center text-2xl mt-20">Welcome to Andy Stevens' site!</div>
  </div>
</template>

<script setup>
useHead({
  meta: [
    {
      name: "description",
      content: "The homepage of poet and writer Andy Stevens.",
    },
  ],
  link: [
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css?family=Fjalla+One",
      crossorigin: "",
    },
  ],
});
</script>
