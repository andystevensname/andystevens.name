<template>
  <div id="container w-full h-full relative">
    <Header />
    <main class="w-full flex-grow relative">
      <slot>
      </slot>
    </main>
    <footer id="footer" class="w-full relative border-t border-white h-12">
      &copy; 2021 Andy Stevens
    </footer>
  </div>
</template>

<static-query>
query {
  metadata {
    siteName
  }
}
</static-query>

<script>
import Header from '~/components/Header.vue'

export default {
  components: {
    Header
  }
}
</script>
