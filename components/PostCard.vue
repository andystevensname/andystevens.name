<template>
  <div>
    <h2>
      <NuxtLink :to="post.path">{{ post.title }}</NuxtLink>
    </h2>
    <p class="md:pt-6">{{ post.description }}</p>
    <PostMeta :post="post" />
  </div>
</template>
<script setup>
defineProps(["post"]);
</script>
