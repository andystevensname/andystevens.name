<template>
    <nav id="nav" class="h-full fixed top-0 bottom-0 z-20 overflow-x-hidden duration-500" v-hammer:swipe.left="$emit('close-nav')">
        <div class="navContainer h-full border-r border-solid border-white">
            <font-awesome :icon="['fa', 'times']" v-on:click="$emit('close-nav')" size="lg" class="cursor-pointer text-white"  style="margin: 14px 16px 10px 16px"/>
            <ul class="border-box w-full list-none px-4 divide-y divide-white m-0">
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/" v-on:click="closeNav" class="w-full block no-underline text-current">Home</g-link></li>
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/blog/" v-on:click="closeNav" class="w-full block no-underline text-current">Blog</g-link></li>
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/writing/" v-on:click="closeNav" class="w-full block no-underline text-current">Writing</g-link></li>
                <li class="p-0 m-0 w-full h-12 border-box"><g-link to="/about/" v-on:click="closeNav" class="w-full block no-underline text-current">About</g-link></li>
            </ul>
        </div>
    </nav>
</template>

<script>
  export default {
    name: 'Navigation',
    methods: {
      openNav(){
          document.getElementById("nav").style.left = "0";
          document.getElementById("nav").style.boxShadow = "0px 0px 1.5rem black";
      },
      closeNav(){
          document.getElementById("nav").style.left = "-15rem";
          document.getElementById("nav").style.boxShadow = "unset";
      }
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
  line-height: 3em;
}

#nav {
  display: block;
  width: 15rem;
  left: -15rem;
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
