<template>
  <div id="theme-switcher" v-if="mounted">
    <font-awesome-icon v-if="theme === false" icon="moon" @click="toggleTheme" size="lg" id="theme-moon"
      class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px" />
    <font-awesome-icon v-else icon="sun" @click="toggleTheme" size="lg" id="theme-sun"
      class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const theme = useState('theme', () => false)
const mounted = ref(false)

function setTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark')
    theme.value = true
  } else {
    document.documentElement.classList.remove('dark')
    theme.value = false
  }
}

function toggleTheme() {
  setTheme(!theme.value)
  try {
    localStorage.setItem('theme', theme.value ? 'dark' : 'light')
  } catch (err) {}
}

onMounted(() => {
  let preferredTheme = null
  try {
    preferredTheme = localStorage.getItem('theme')
  } catch (err) {}
  const darkThemePreference = window.matchMedia('(prefers-color-scheme: dark)')
  if (preferredTheme === 'dark') setTheme(true)
  else if (preferredTheme === 'light') setTheme(false)
  else setTheme(darkThemePreference.matches)
  darkThemePreference.addEventListener('change', (event) => {
    setTheme(event.matches)
  })
  mounted.value = true
})
</script>

<style>
#theme-switcher {
  display: inline-block;
}
</style>
