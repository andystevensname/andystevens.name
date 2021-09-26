<template>
  <div>
      <div class="meta">
        <span>{{ post.date }}</span> &middot;
        <g-link class="" v-for="tag in post.tags" :key="tag.id" :to="tag.path">
          #{{ tag.title }}
        </g-link>
      </div>
  </div>
</template>
<script>
export default {
  props: ['post']
}
</script>