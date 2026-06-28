import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the Clockwork prototype.
// Static build output lands in dist/ which Render serves directly.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
