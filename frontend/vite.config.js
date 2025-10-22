import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
      tailwindcss(),
  ],
  define: {
    global: "window", // Fix for `global` not defined
    "process.env": {}, // Avoid process undefined errors
  },
  resolve: {
    alias: {
      util: "util/",
      process: "process/browser",
      buffer: "buffer/",
      events: "events/", // ✅ new addition for EventEmitter
    },
  },
})
