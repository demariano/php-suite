import { StoryFn } from '@storybook/react';
import Button from '../../form-controls/button/button';
import { Header as HeaderComponent, IHeader } from './header';

export default {
    title: 'Components/Navigation/Header',
    component: HeaderComponent,
    parameters: {
        layout: 'fullscreen',
    },
};

const Template: StoryFn<typeof HeaderComponent> = (args: IHeader) => (
    <HeaderComponent {...args} />
);

export const Default = Template.bind({});
Default.args = {
    home: {
        label: 'Old St',
        imageLink: '/assets/images/logo.png',
    },
    menu: [
        {
            label: 'Dashboard',
            key: 'dashboard',
        },
        {
            label: 'Accident Records',
            key: 'accidents',
        },
        {
            label: 'Near-miss Records',
            key: 'near-miss',
        },
    ],
    activeMenu: 'dashboard',
    rightAction: <Button label="button" onClick={() => alert('hello')} />,
};
