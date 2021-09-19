// This is where project configuration and plugin options are located.
// Learn more: https://gridsome.org/docs/config

// Changes here require a server restart.
// To restart press CTRL + C in terminal and run `gridsome develop`

const tailwind = require('tailwindcss')

const postcssPlugins = [
  tailwind(),
]

module.exports = {
    siteName: 'Andy Stevens',
    siteUrl: 'https://andystevens.name',
    plugins: [
      {
        use: '@gridsome/source-filesystem',
        options: {
          baseDir: './blog',
          path: '*.md',
          typeName: 'Post',
        }
      },
      {
        use: '@gridsome/plugin-google-analytics',
        options: {
          id: 'UA-66844301-1'
        }
      },
      {
        use: 'gridsome-plugin-rss',
        options: {
          contentTypeName: 'Post',
          latest: true,
          maxItems: 20,
          feedOptions: {
            title: "Andy Stevens' Blog",
            feed_url: 'https://andystevens.name/rss.xml',
            site_url: 'https://andystevens.name'
          },
          feedItemOptions: node => ({
            title: node.title,
            description: node.description,
            url: 'https://andystevens.name/blog/' + node.slug,
          }),
          output: {
            dir: './static',
            name: 'rss.xml'
          }
        }
      },
      {
        use: '@gridsome/plugin-sitemap',
        options: {
          include: ['/','/blog/', '/blog/**','/about/','/writing/']
        }
      }
    ],
    transformers: {
      remark: {
        externalLinksTarget: '_blank',
        externalLinksRel: ['nofollow', 'noopener', 'noreferrer'],
        anchorClassName: 'icon icon-link',
        plugins: [ [
          '@gridsome/remark-prismjs',
          {
            showLineNumbers: true,
            transformInlineCode: true
          }
        ]]
      }
    },
    css: {
        loaderOptions: {
            postcss: {
                plugins: postcssPlugins,
            },
        },
    },
    templates: {
        Post: '/blog/:slug'
    }
}
