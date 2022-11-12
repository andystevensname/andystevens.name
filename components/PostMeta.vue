<template>
  <div>
    <div class="meta">
      <span>{{ months[month] }} {{ day }}, {{ year }}</span> &middot;
      <NuxtLink class="" v-for="(tag, n) in post.tags" :key="n" :to="`/blog/tags/${tag}`">
        #{{ tag }}
      </NuxtLink>
    </div>
  </div>
</template>
<script setup>
const props = defineProps(["post"]);
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var date = new Date(props.post.date);
console.log(date)
var day = date.getDate();
console.log(day)
var month = date.getMonth();
var year = date.getFullYear();
</script>
