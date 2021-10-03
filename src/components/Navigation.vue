<template>
    <nav id="nav" class="h-full w-60 -translate-x-60 fixed top-0 bottom-0 z-20 overflow-x-hidden transform duration-500">
        <div class="navContainer h-full border-r border-solid border-white">
            <font-awesome :icon="['fa', 'times']" v-on:click="$emit('close-nav')" size="lg" class="cursor-pointer text-white"  style="margin: 14px 16px 10px 16px"/>
            <ul class="border-box w-full list-none px-4 divide-y divide-white m-0">
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/" class="w-full block no-underline text-current">Home</g-link></li>
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/blog/" class="w-full block no-underline text-current">Blog</g-link></li>
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/writing/" class="w-full block no-underline text-current">Writing</g-link></li>
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/about/" class="w-full block no-underline text-current">About</g-link></li>
            </ul>
        </div>
    </nav>
</template>

<script>
    export default {
        name: 'Navigation',
    }
</script>


<style>
#nav {
    display: block;
}

#nav .navContainer {
    background-color: #212121;
}

#nav ul li a {
    border-bottom: 0;
}

#nav ul li a:active, #nav ul li a:hover, #nav ul li a:visited {
    color: white;
}
</style>
