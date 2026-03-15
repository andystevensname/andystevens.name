<template>
  <div id="content">
    <Header @open-nav="navOpen = true" />
    <Navigation :open="navOpen" @close-nav="navOpen = false" @open-nav="navOpen = true" />
    <main class="w-full flex-grow relative">
      <slot />
    </main>
    <footer id="footer" class="w-full relative h-12 border-t border-googleGray dark:border-white">
      &copy; 2021 Andy Stevens
    </footer>
  </div>
</template>
<script setup>
const navOpen = ref(false)
</script>
