import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// This is a small inline plugin to set the correct MIME type for .wasm files.
const wasmContentTypePlugin = {
  name: 'wasm-content-type-plugin',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configureServer(server: { middlewares: { use: (arg0: (req: any, res: any, next: any) => void) => void; }; }) {
    server.middlewares.use((req, res, next) => {
      // Check if the request is for a .wasm file
      if (req.url?.endsWith('.wasm')) {
        // Set the Content-Type header to application/wasm
        res.setHeader('Content-Type', 'application/wasm');
      }
      // Pass the request to the next middleware
      next();
    });
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), wasmContentTypePlugin],
})
