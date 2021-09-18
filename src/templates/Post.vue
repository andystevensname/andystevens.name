<template>
  <Layout>
    <article class="px-4 relative h-full table">
      <h1 class="w-full text-5xl mb-6 text-center">{{ $page.post.title }}</h1>
      <div v-html="$page.post.content" />
      <div class="date" v-html="$page.post.date" />
    </article>
  </Layout>
</template>

<script>
export default {
  metaInfo() {
    return {
      title: this.$page.post.title
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
  }
}
</page-query>

<style>

</style>
