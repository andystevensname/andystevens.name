<template>
  <Layout>
    <article class="px-4 relative h-full">
      <h1 class="w-full text-5xl mb-6 text-center">Blog</h1>
      <PostCard v-for="edge in $page.posts.edges" :key="edge.node.id" :post="edge.node"/>
    </article>
  </Layout>
</template>

<page-query>
query {
  posts: allPost(filter: { published: { eq: true }}) {
    edges {
      node {
        id
        title
        slug
        path
        published
        description
        date (format: "MMMM D, Y")
      }
    }
  }
}
</page-query>

<script>
import PostCard from '~/components/PostCard.vue'
export default {
  components: {
    PostCard
  },
  metaInfo: {
    title: 'Blog',
    meta: [
      {
        name: 'description',
        content: 'Blog posts, essays, and missives by Andy Stevens'
      }
    ]
  }
}
</script>
