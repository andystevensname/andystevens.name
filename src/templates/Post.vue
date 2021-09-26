<template>
  <Layout>
    <article class="px-4 relative h-full table">
      <h1 class="w-full text-5xl mb-6 text-center">{{ $page.post.title }}</h1>
      <div v-html="$page.post.content" />
      <PostMeta :key="$page.post.id" :post="$page.post" />
    </article>
  </Layout>
</template>

<script>
import PostMeta from '~/components/PostMeta.vue'
export default {
  components: {
    PostMeta
  },
  metaInfo() {
    return {
      title: this.$page.post.title,
      meta: [
        { name: 'description', content: this.$page.post.description }
      ],
    }
  }
}
</script>

<page-query>
query ($id: ID!) {
  post: post (id: $id) {
    title
    content
    slug
    date (format: "MMMM D, Y")
    description
    tags {
      id
      title
      path
    }
  }
}
</page-query>

<style>

</style>
