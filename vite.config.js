import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'run-build-plugin',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/run-build') {
            console.log('🚀 Build triggered via browser dev button');
            // Open in a new terminal window to show progress
            exec('start cmd /c "build_everything.bat"', (error) => {
              if (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: error.message }));
              } else {
                res.end(JSON.stringify({ success: true }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ],
  base: './',
})
