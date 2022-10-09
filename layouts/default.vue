<template>
    <div id="content">
        <client-only>
            <Header @open-nav="openNav" :theme="theme" @change-theme="toggleTheme" />
        </client-only>
        <client-only>
            <Navigation @close-nav="closeNav" @open-nav="openNav" v-hammer:swipe.left="closeNav" />
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
    var theme = useState('theme');
    var preferredTheme;
    try {
        preferredTheme = localStorage.getItem('theme');
    } catch (err) { }

    function openNav() {
        document.getElementById("nav").classList.remove('-translate-x-60')
    }

    function closeNav() {
        document.getElementById("nav").classList.add('-translate-x-60');
    }

    function setTheme(newTheme) {
        if (newTheme === 'light') {
            document.documentElement.classList.remove('dark');
            theme.value = false;
        } else {
            document.documentElement.classList.add('dark');
            theme.value = true;
        }
    }

    function toggleTheme() {
        theme.value = !theme.value;
        setPreferredTheme(theme.value ? 'dark' : 'light')
    }

    function setPreferredTheme(newTheme) {
        setTheme(newTheme);
        try {
            localStorage.setItem('theme', newTheme);
        } catch (err) {}
    }

    onMounted(() => {
        var darkThemePreference = window.matchMedia('(prefers-color-scheme: dark)');

        setTheme(preferredTheme || (darkThemePreference.matches ? 'dark' : 'light'));

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            setTheme(event.matches ? 'dark' : 'light')
        })
    })
</script>