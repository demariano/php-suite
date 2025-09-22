const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');
const defaultTheme = require('tailwindcss/defaultTheme');

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
        extend: {
            fontFamily: {
                inter: ['Inter', ...defaultTheme.fontFamily.serif],
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('daisyui'),
        require('tailwind-scrollbar-hide'),
        function ({ addUtilities }) {
            addUtilities({
                '.flex-centered': {
                    '@apply flex items-center justify-center gap-2': {},
                },
                '.flex-spaced': {
                    '@apply flex justify-between': {},
                }
            })
        }
    ],
    daisyui: {
        themes: ['nord']
    }
};
