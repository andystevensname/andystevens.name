<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>

  var darkTheme = useState('theme', () => false )
  
  useHead({
    titleTemplate: (titleChunk) => {
      return titleChunk ? `${titleChunk} - Andy Stevens` : 'Andy Stevens';
    },
    charset: 'utf-8'
  })
</script>
