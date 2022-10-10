module.exports = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          googleGray: '#212121'
        }
      },
    },
    plugins: [],
    content: [
      `components/**/*.{vue,js}`,
      `layouts/**/*.vue`,
      `pages/**/*.vue`,
      `composables/**/*.{js,ts}`,
      `plugins/**/*.{js,ts}`,
      `App.{js,ts,vue}`,
      `app.{js,ts,vue}`
    ]
  }