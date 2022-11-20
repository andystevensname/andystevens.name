<template>
  <div id="content">
    <client-only>
      <Header @open-nav="openNav" />
    </client-only>
    <client-only>
      <Navigation @close-nav="closeNav" @open-nav="openNav" />
    </client-only>
    <main class="w-full flex-grow relative">
      <slot />
    </main>
    <footer id="footer" class="w-full relative h-12 border-t border-googleGray dark:border-white">
      &copy; 2021 Andy Stevens
    </footer>
  </div>
</template>
<script setup>
function openNav() {
  document.getElementById("nav").classList.remove("-translate-x-60");
}

function closeNav() {
  document.getElementById("nav").classList.add("-translate-x-60");
}
</script>
