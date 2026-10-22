// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
    output: "server",
    adapter: node({
        mode: "standalone",
    }),
    site: "https://jamesrudas.com/",
    vite: {
        resolve: {
            alias: {
                "@styles": "/src/styles",
                "@js"   : "/src/js",
            }
        }
    },
    devToolbar: {
       enabled: false,
    }
});
