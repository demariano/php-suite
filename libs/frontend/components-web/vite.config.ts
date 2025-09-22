import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    root: __dirname,
    cacheDir: '../../../node_modules/.vite/libs/frontend/components-web',
    plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
    resolve: {
        alias: {
            '@ui-config': path.join(__dirname, '../ui-config/src'),
            '@components': path.join(__dirname, '../components-web/src'),
            '@components-types': path.join(__dirname, '../components-web/src/types'),
            '@utils': path.join(__dirname, '../../utils/src')
        },
    },
    server: {
        hmr: { overlay: false }
    },
    css: {
        preprocessorOptions: {
            scss: {
                // Use the modern API for Sass
                // Fixed legacy JS API deprecation
                api: 'modern',
            },
        },
    },
    test: {
        watch: false,
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        reporters: ['default'],
        coverage: {
            reportsDirectory: '../../../coverage/libs/frontend/components-web',
            provider: 'v8',
        },
    },
});
