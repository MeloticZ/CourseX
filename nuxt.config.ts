// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  srcDir: 'app',
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/content'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      WORKERS_CI_COMMIT_SHA: process.env.WORKERS_CI_COMMIT_SHA || ''
    }
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  app: {
    head: {
      title: 'CourseX',
      meta: [
        { name: 'description', content: 'CourseX is a website that helps you find courses at USC. Your experience is at the center of focus.' },
      ],
    }
  }
})