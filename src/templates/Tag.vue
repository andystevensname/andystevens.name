<template>
  <Layout>
    <article class="px-4 relative h-full table">
      <h1 class="w-full text-5xl mb-6 text-center">Posts Tagged with '{{ $page.tag.title }}'</h1>
      <PostCard v-for="edge in $page.tag.belongsTo.edges" :key="edge.node.id" :post="edge.node"/>
    </article>
  </Layout>
</template>

<script>
import PostCard from '~/components/PostCard.vue'
export default {
  components: {
    PostCard
  },
  metaInfo() {
    return {
      title: this.$page.tag.title,
      meta: [
        { name: 'description', content: "Posts tagged as " + this.$page.tag.title }
      ],
    }
  }
}
</script>

<page-query>
query Tag ($id: ID!) {
  tag (id: $id) {
    title
    belongsTo {
      edges {
        node {
          ...on Post {
            title
            path
            date (format: "MMMM D, Y")
            description
            content
            tags {
                id
                title
                path
            }
          }
        }
      }
    }
  }
}
</page-query>

<style>

</style>
