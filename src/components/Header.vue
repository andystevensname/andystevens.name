<template>
    <header id="header" class="block fixed inset-0 border-box z-10 h-12 border-b border-solid border-googleGray bg-white duration-500 transform dark:bg-googleGray dark:border-white bg-opacity-80">
        <font-awesome :icon="['fa', 'bars']" v-on:click="$root.$emit('open-nav')" size="lg" class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px"/>
        <font-awesome :icon="['fa', 'moon']" v-on:click="changeTheme" size="lg" id="theme-moon" class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px"/>
        <font-awesome :icon="['fa', 'sun']" v-on:click="changeTheme" size="lg" id="theme-sun" class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px"/>
        <span class="title-text h-12 block float-right mr-4 font-bold">Andy Stevens</span>
    </header>
</template>

<script>
export default {
    name: 'Header',
    methods: {
        setDark: function() {
            // Whenever the user explicitly chooses dark mode
            localStorage.theme = 'dark'
            document.documentElement.classList.add('dark');
            this.$root.$emit('changeTheme');
            document.getElementById('theme-moon').classList.add('hidden');
            document.getElementById('theme-sun').classList.remove('hidden');
            document.getElementById('theme-moon').style.setProperty('display', 'none');
            document.getElementById('theme-sun').style.setProperty('display', 'inline-block');
        },

        setLight: function() {
            // Whenever the user explicitly chooses light mode
            localStorage.theme = 'light'
            document.documentElement.classList.remove('dark');
            this.$root.$emit('changeTheme');
            document.getElementById('theme-moon').classList.remove('hidden');
            document.getElementById('theme-sun').classList.add('hidden');
            document.getElementById('theme-moon').style.setProperty('display', 'inline-block');
            document.getElementById('theme-sun').style.setProperty('display', 'none');
        },

        // On page load or when changing themes, best to add inline in `head` to avoid FOUC
        changeTheme: function() {
            if (localStorage.theme === 'dark') {
                this.setLight();
            } else {
                this.setDark();
            }
        }
    },
    mounted() {
        // https://webdesign.tutsplus.com/tutorials/how-to-hide-reveal-a-sticky-header-on-scroll-with-javascript--cms-33756
        const header = document.getElementById("header");
        let lastScroll = 0;

        window.addEventListener("scroll", () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > lastScroll && !header.classList.contains('-translate-y-12')) {
                // down
                header.classList.add('-translate-y-12');
            } else if (currentScroll < lastScroll && header.classList.contains('-translate-y-12')) {
                // up
                header.classList.remove('-translate-y-12');
            }
            lastScroll = currentScroll;
        });

        if (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.setDark();
        } else if (!('theme' in localStorage) && !(window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            this.setLight();
        } else if (localStorage.theme === 'dark') {
            this.setDark();
        } else {
            this.setLight();
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (event.matches) {
                this.setDark()
            } else {
                this.setLight()
            }
        })
    }
}
</script>


<style>
.title-text {
    line-height: 3; 
}
</style>
