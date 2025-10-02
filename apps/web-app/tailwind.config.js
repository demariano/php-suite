const { createGlobPatternsForDependencies } = require('@nx/react/tailwind');
const { join } = require('path');

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
            colors: {
                'table-header': '#eff6ff', // Light blue for headers
                'table-border': '#f3f4f6', // Light gray for borders
                'row-separator': '#e2e8f0', // Light gray for row separators
                'status-active': '#dcfce7', // Light green for active status
                'status-inactive': '#fef2f2', // Light red for inactive status
                'status-pending': '#fefce8', // Light yellow for pending status
                'status-approval': '#dbeafe', // Light blue for approval status
            },
            spacing: {
                'table-padding': '16px 24px', // Custom table padding
            }
        },
    },
    plugins: [],
    presets: [
        require('../../tailwind-workspace-preset.js'),
        require('../../libs/frontend/components-web/tailwind.config.js')
    ]
};
