<template>
  <div>
      <h2><g-link :to="post.path">{{post.title}}</g-link></h2>
      <p class="md:pt-6" v-html="post.description" />
      <PostMeta :key="post.id" :post="post" />
  </div>
</template>
<script>
import PostMeta from '~/components/PostMeta.vue'
export default {
  components: {
    PostMeta
  },
  props: ['post']
}
</script>