<template>
    <div id="container w-full h-full relative">
        <!-- <ClientOnly> -->
            <Header />
            <Navigation v-on:close-nav="closeNav" />
        <!-- </ClientOnly> -->
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
import Navigation from '~/components/Navigation.vue'

export default {
    components: {
        Header,
        Navigation
    },
    methods: {
        openNav: function () {
            document.getElementById("nav").style.left = "0";
            document.getElementById("nav").style.boxShadow = "0px 0px 1.5rem black";
            console.log('open')
        },
        closeNav: function() {
            document.getElementById("nav").style.left = "-15rem";
            document.getElementById("nav").style.boxShadow = "unset";
            console.log('close')
        }
    },
    mounted() {
        self = this;
        this.$root.$on('open-nav', function() {
            self.openNav();
        });
    }
}
</script>
