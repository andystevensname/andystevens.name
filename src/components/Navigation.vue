<template>
    <nav id="nav" class="h-full w-60 -translate-x-60 fixed top-0 bottom-0 z-20 overflow-x-hidden transform duration-500">
        <div class="navContainer h-full border-r border-solid border-googleGray bg-white dark:bg-googleGray dark:border-white">
            <font-awesome :icon="['fa', 'times']" v-on:click="$emit('close-nav')" size="lg" class="cursor-pointer text-googleGray dark:text-white" style="margin: 14px 16px 10px 16px"/>
            <ul class="border-box w-full list-none px-4 m-0 divide-y divide-googleGray dark:divide-white">
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/" class="w-full block no-underline text-googleGray dark:text-white">Home</g-link></li>
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/blog/" class="w-full block no-underline text-googleGray dark:text-white">Blog</g-link></li>
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/writing/" class="w-full block no-underline text-googleGray dark:text-white">Writing</g-link></li>
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/about/" class="w-full block no-underline text-googleGray dark:text-white">About</g-link></li>
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

#nav ul li a {
    border-bottom: 0;
}
</style>
