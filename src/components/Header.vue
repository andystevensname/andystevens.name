<template>
    <header id="header" class="block fixed inset-0 border-box z-10 h-12 border-b border-solid border-googleGray bg-white duration-500 transform dark:bg-googleGray dark:border-white bg-opacity-80 dark:bg-opacity-80">
        <font-awesome :icon="['fa', 'bars']" v-on:click="$root.$emit('open-nav')" size="lg" class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px"/>
        <font-awesome v-if="darkTheme === false" :icon="['fa', 'moon']" v-on:click="toggleTheme" size="lg" id="theme-moon" class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px"/>
        <font-awesome v-else :icon="['fa', 'sun']" v-on:click="toggleTheme" size="lg" id="theme-sun" class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 14px 16px"/>
        <span class="title-text h-12 block float-right mr-4 font-bold">Andy Stevens</span>
    </header>
</template>

<script>
export default {
    name: 'Header',
    data: function () {
        return {
            darkTheme: false
        }
    },
    methods: {
        toggleTheme() {
            this.darkTheme = !this.darkTheme
            // This is using a script that is added in index.html
            window.__setPreferredTheme(
                this.darkTheme ? 'dark' : 'light'
            )
            this.$root.$emit('changeTheme');
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

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
            if (event.matches) {
                this.darkTheme = true;
            } else {
                this.darkTheme = false;
            }
            window.__setPreferredTheme(
                this.darkTheme ? 'dark' : 'light'
            )
        })

        if (window.__theme == 'dark') {
            this.darkTheme = true;
        }
    }
}
</script>


<style>
.title-text {
    line-height: 3; 
}
</style>
