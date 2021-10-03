<template>
    <header id="header" class="block fixed inset-0 border-box z-10 h-12 border-b border-solid border-white duration-500 transform">
        <font-awesome :icon="['fa', 'bars']" v-on:click="$root.$emit('open-nav')" size="lg" class="cursor-pointer text-white" style="margin: 14px 16px 14px 16px"/>
        <span class="title-text h-12 block float-right mr-4 font-bold">Andy Stevens</span>
    </header>
</template>

<script>
export default {
    name: 'Header',
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
    }
}
</script>


<style>
header#header {
    background-color: rgba(33, 33, 33, .8);
}

header#header.scroll-down {
    top: -3rem;
}

header#header.scroll-up {
    box-shadow: 0px 0px .25rem black;
}

.title-text {
    line-height: 3; 
}
</style>
