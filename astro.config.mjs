// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    output: "static",
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
