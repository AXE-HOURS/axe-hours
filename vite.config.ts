import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isHmrDisabled = process.env.DISABLE_HMR === 'true';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: isHmrDisabled
        ? false
        : {
            clientPort: 443,
            protocol: 'wss',
          },
      watch: isHmrDisabled ? null : {},
    },
    build: {
      modulePreload: {
        resolveDependencies: (filename, deps) =>
          deps.filter(dep => !dep.includes('pdf') && !dep.includes('jspdf') && !dep.includes('html2canvas')),
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase')) {
              return 'firebase';
            }
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/motion/') ||
              id.includes('node_modules/lucide-react/')
            ) {
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
