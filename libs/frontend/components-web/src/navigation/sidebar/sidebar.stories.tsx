import type { Meta, StoryFn } from '@storybook/react';
import { Dashboard, Evaluations, Groups, Reporting } from '../../icons';
import SidebarComponent from './sidebar';

const Story: Meta<typeof SidebarComponent> = {
    component: SidebarComponent,
    title: 'Components/Navigation/Sidebar',
    parameters: {
        layout: 'fullscreen',
    }
};
export default Story;

const Template: StoryFn<typeof SidebarComponent> = (args) => {
    // TODO: add mobile responsive styling
    // const [showSidebar, setShowSidebar] = useState(true);

    return (
        <div className='flex'>
            <SidebarComponent {...args} />

            {/* <Navbar onMenuButtonClick={() => setShowSidebar((prev) => !prev)} /> */}
            Lorem reprehenderit aliquip laborum cillum. Magna consectetur veniam ipsum dolore officia quis voluptate labore aliqua pariatur qui. Sint ex voluptate sit mollit eiusmod officia deserunt veniam ex anim elit sunt. Veniam do ea dolor duis minim occaecat dolore sint. Incididunt amet non occaecat excepteur ipsum ad adipisicing duis exercitation minim amet amet excepteur.
        </div>
    );
};

export const Default = Template.bind({});
Default.args = {
    profile: {
        name: 'Jane Doe',
        email: 'jane@email.com'
    },
    menu: [{
        sectionTitle: 'Overview',
        menuItems: [{
            label: 'Overview',
            onClick: () => null,
            icon: Dashboard,
            route: 'overview'
        }, {
            label: 'Infrastructure',
            onClick: () => null,
            icon: Evaluations,
            route: 'infrastructure'
        }, {
            label: 'Fleet Consumption',
            onClick: () => null,
            icon: Groups,
            route: 'fleet-consumption',
        }]
    }, {
        sectionTitle: 'Admin',
        menuItems: [{
            label: 'Notifications',
            onClick: () => null,
            icon: Reporting,
            route: 'notifications',
            badge: 2
        }]
    }]
};
