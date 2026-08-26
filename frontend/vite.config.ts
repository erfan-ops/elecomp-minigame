import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow testing from other devices on the LAN (e.g. the actual kiosk).
    host: true,
  },
});
