<template>
    <div id="header-container">
        <header id="main" class="block fixed inset-0 border-box z-10 h-12 border-b border-solid border-white duration-500">
            <font-awesome :icon="['fa', 'bars']" v-on:click="$root.$emit('open-nav')" size="lg" class="cursor-pointer text-white" style="margin: 14px 16px 14px 16px"/>
            <span class="title-text h-12 block float-right mr-4 font-bold">Andy Stevens</span>
        </header>
    </div>
</template>

<script>
export default {
    name: 'Header',
    mounted() {
        // https://webdesign.tutsplus.com/tutorials/how-to-hide-reveal-a-sticky-header-on-scroll-with-javascript--cms-33756
        const header = document.getElementById("header-container");
        const scrollUp = "scroll-up";
        const scrollDown = "scroll-down";
        let lastScroll = 0;

        window.addEventListener("scroll", () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll <= 0) {
                header.classList.remove(scrollUp);
                return;
            }

            if (currentScroll > lastScroll && !header.classList.contains(scrollDown)) {
                // down
                header.classList.remove(scrollUp);
                header.classList.add(scrollDown);
            } else if (currentScroll < lastScroll && header.classList.contains(scrollDown)) {
                // up
                header.classList.remove(scrollDown);
                header.classList.add(scrollUp);
            }
            lastScroll = currentScroll;
        });
    }
}
</script>


<style>
header#main {
    background-color: rgba(33, 33, 33, .8);
}

#header-container.scroll-down header#main {
    top: -3rem;
}

#header-container.scroll-up header#main {
    top: 0;
    box-shadow: 0px 0px .25rem black;
}

.title-text {
    line-height: 3; 
}
</style>
