<template>
    <div id="container w-full h-full relative">
        <Header />
        <Navigation v-on:close-nav="closeNav" v-hammer:swipe.left="closeNav" />
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
            document.getElementById("nav").classList.remove('-translate-x-60')
            /*document.getElementById("nav").style.left = "0";
            document.getElementById("nav").style.boxShadow = "0px 0px 1.5rem black";*/
        },
        closeNav: function() {
            document.getElementById("nav").classList.add('-translate-x-60');
            /*document.getElementById("nav").style.left = "-15rem";
            document.getElementById("nav").style.boxShadow = "unset";*/
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
