module.exports = {
    theme: {
        extend: {
            keyframes: {
                shimmer: {
                    '0%': {
                        backgroundColor: '#EDEFF5',
                        opacity: '30%'
                    },
                    '100%': {
                        backgroundColor: '#C1C4D6',
                        opacity: '90%'
                    }
                }
            },
            animation: {
                shimmer: 'shimmer 1s linear infinite alternate',
            }
        },
    },
    variants: {
        extend: {},
    },
    plugins: [
        require('tailwind-scrollbar-hide'),
        require('@tailwindcss/typography'),
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
};
