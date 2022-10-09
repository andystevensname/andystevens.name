<template>
    <div class="w-full h-full relative">
        <client-only placeholder="loading...">
            <Animation />
        </client-only>
    </div>
</template>

<script setup>
  useHead({
    meta: [
      {
        name: 'description',
        content: 'The homepage of poet and writer Andy Stevens.'
      }
    ],
    link: [
      { 
        rel: 'stylesheet', 
        href: 'https://fonts.googleapis.com/css?family=Fjalla+One', 
        crossorigin: '' 
      }
    ]
  })
</script>
