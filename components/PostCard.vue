<template>
  <div>
    <h2>
      <NuxtLink :to="post._path">{{ post.title }}</NuxtLink>
    </h2>
    <p class="md:pt-6" v-html="post.description" />
    <PostMeta :post="post" />
  </div>
</template>
<script setup>
defineProps(["post"]);
</script>
