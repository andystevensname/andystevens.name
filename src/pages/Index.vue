<template>
    <Layout>
        <Animation />
    </Layout>
</template>

<script>
import Animation from '~/components/Animation'

export default {
    components: {
        Animation
    },
    metaInfo: {
        title: 'Homepage',
        meta: [
            {
                name: 'description',
                content: 'The homepage of writer, poet, and tinkerer Andy Stevens.'
            }
        ]
    }
}
</script>
