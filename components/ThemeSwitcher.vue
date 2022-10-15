<template>
  <div id="theme-switcher">
    <font-awesome-icon v-if="theme === false" icon="moon" @click="toggleTheme" size="lg" id="theme-moon"
      class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px" />
    <font-awesome-icon v-else icon="sun" @click="toggleTheme" size="lg" id="theme-sun"
      class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px" />
  </div>
</template>

<script setup>
var theme = useState("theme");
var preferredTheme;
try {
  preferredTheme = localStorage.getItem("theme");
} catch (err) { }

function setTheme(newTheme) {
  if (newTheme === "light") {
    document.documentElement.classList.remove("dark");
    theme.value = false;
  } else {
    document.documentElement.classList.add("dark");
    theme.value = true;
  }
}

function toggleTheme() {
  theme.value = !theme.value;
  setPreferredTheme(theme.value ? "dark" : "light");
}

function setPreferredTheme(newTheme) {
  setTheme(newTheme);
  try {
    localStorage.setItem("theme", newTheme);
  } catch (err) { }
}

onMounted(() => {
  var darkThemePreference = window.matchMedia("(prefers-color-scheme: dark)");

  setTheme(preferredTheme || (darkThemePreference.matches ? "dark" : "light"));

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (event) => {
      setTheme(event.matches ? "dark" : "light");
    });
});
</script>

<style>
#theme-switcher {
  display: inline-block;
}
</style>
