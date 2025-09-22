const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');
const colors = require('./src/styles/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        join(
            __dirname,
            '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}'
        ),
        ...createGlobPatternsForDependencies(__dirname),
    ],
    theme: {
        colors: {
            ...colors,
            transparent: 'transparent'
        },
        extend: {
            fontFamily: {
                // Declare fontFamily if app uses multiple font family
                // proximaNova: ['Proxima Nova', ...defaultTheme.fontFamily.serif],
            }
        }
    },
    plugins: [
        // require('daisyui')
    ],
    presets: [require('../../../tailwind-workspace-preset.js')],
};
