<template>
  <div>
      <h2><g-link :to="post.path">{{post.title}}</g-link></h2>
      <p class="md:pt-6" v-html="post.description" />
      <div class="date" v-html="post.date" />
  </div>
</template>
<script>
export default {
  props: ['post'],
}
</script>