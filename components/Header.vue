<template>
  <header id="header" ref="header"
    class="block fixed inset-0 border-box z-10 h-12 border-b border-solid border-googleGray bg-white duration-500 transform dark:bg-googleGray dark:border-white bg-opacity-80 dark:bg-opacity-80">
    <font-awesome-icon icon="bars" @click="$emit('openNav')" size="lg"
      class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px" />
    <ThemeSwitcher />
    <span class="title-text h-12 block float-right mr-4 font-bold">
      <NuxtLink to="/">Andy Stevens</NuxtLink>
    </span>
  </header>
</template>

<script setup>
import { ref, onMounted } from "vue";
const props = defineProps({
  theme: Boolean,
});
//const theme = ref(props.theme)
const emit = defineEmits(["openNav", "changeTheme"]);
const header = ref(null);
function toggleTheme() {
  emit("changeTheme");
}

onMounted(() => {
  // https://webdesign.tutsplus.com/tutorials/how-to-hide-reveal-a-sticky-header-on-scroll-with-javascript--cms-33756
  let lastScroll = 0;

  window.addEventListener("scroll", () => {
    const currentScroll = window.pageYOffset;

    if (
      currentScroll > lastScroll &&
      !header.value.classList.contains("-translate-y-12")
    ) {
      // down
      header.value.classList.add("-translate-y-12");
    } else if (
      currentScroll < lastScroll &&
      header.value.classList.contains("-translate-y-12")
    ) {
      // up
      header.value.classList.remove("-translate-y-12");
    }
    lastScroll = currentScroll;
  });
});
</script>

<style>
.title-text {
  line-height: 3;
}
</style>
