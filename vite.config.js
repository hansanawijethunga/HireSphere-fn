import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-amplify': ['aws-amplify', '@aws-amplify/ui-react'],
          'vendor-fluent':  ['@fluentui/react-components', '@fluentui/react-icons'],
          'vendor-misc':    ['axios', 'socket.io-client', 'date-fns'],
        },
      },
    },
  },
});
