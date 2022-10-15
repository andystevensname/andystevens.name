<template>
  <div>
    <div class="meta">
      <span>{{ post.date }}</span> &middot;
      <NuxtLink
        class=""
        v-for="(tag, n) in post.tags"
        :key="n"
        :to="`/blog/tags/${tag}`"
      >
        #{{ tag }}
      </NuxtLink>
    </div>
  </div>
</template>
<script setup>
defineProps(["post"]);
</script>
