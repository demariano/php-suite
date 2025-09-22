module.exports = {
    '*.{js,jsx,ts,tsx}': ['npx nx lint'],
    '*.{json,md,html,css,scss}': ['npx prettier --write'],
};