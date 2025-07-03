import { resolve } from 'path';
import { defineConfig } from 'vite';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';

export default defineConfig({
  resolve: {
    alias: {
      '@processor': resolve(__dirname, '../../processor/src'),
    },
  },
  plugins: [
    cssInjectedByJsPlugin({
      injectCodeFunction(cssCode: string, options) {
        try {
          if (typeof document !== 'undefined') {
            const style = document.createElement('style');
            style.setAttribute('data-ctc-connector-styles', '');
            for (const attr in options.attributes) {
              style.setAttribute(attr, options.attributes[attr]);
            }
            style.appendChild(document.createTextNode(cssCode));
            document.head.appendChild(style);
          }
        } catch (e) {
          console.error('vite-plugin-css-injected-by-js', e);
        }
      },
    }),
  ],
  build: {
    outDir: resolve(__dirname, 'public'),
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'Connector',
      formats: ['es', 'umd'],
      fileName: (format) => `connector-enabler.${format}.js`,
    },
  },
});
