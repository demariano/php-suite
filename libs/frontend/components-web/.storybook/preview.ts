import { Preview } from '@storybook/react';
import '../src/styles/index.scss';

const preview: Preview = {
    parameters: {
        options: {
            storySort: {
                order: ['Colors'],
            },
        },
    },
};

export default preview;
