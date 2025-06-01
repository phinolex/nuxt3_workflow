export default defineNuxtConfig({
  modules: ["@bg-dev/nuxt-naiveui"],
    app: {
      head: {
        htmlAttrs: { lang: "en" },
      },
    },
    css: [
    "@/assets/main.scss",
    '@mdi/font/css/materialdesignicons.min.css',
    '@fortawesome/fontawesome-svg-core/styles.css',
    '@vue-flow/core/dist/style.css',
    '@vue-flow/core/dist/theme-default.css',
    '@vue-flow/controls/dist/style.css',
    '@vue-flow/minimap/dist/style.css'
    ],
    build: {
        transpile: [
          'vuetify',
          '@fortawesome/fontawesome-svg-core',
        '@fortawesome/free-brands-svg-icons',
        '@fortawesome/free-regular-svg-icons',
        '@fortawesome/free-solid-svg-icons',
        '@fortawesome/vue-fontawesome'
        ],
      },
    vite: {
      css: {
        preprocessorOptions: {
          scss: {
          },
        },
      },
    },
  });
