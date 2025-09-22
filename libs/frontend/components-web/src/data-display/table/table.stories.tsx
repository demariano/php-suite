import type { Meta, StoryFn } from '@storybook/react';
import { Attach } from '../../icons/Attach';
import Typography from '../typography/typography';
import { Table as TableComponent } from './table';

const Story: Meta<typeof TableComponent> = {
    component: TableComponent,
    title: 'Components/Data Display/Table',
    parameters: {
        backgrounds: {
            default: 'gray',
            values: [
                { name: 'white', value: '#FFFFFF' },
                { name: 'gray', value: '#F5F5F5' }
            ]
        }
    }
};
export default Story;

const list = [
    {
        athlete: "Daniella Decker",
        email: "daniela@email.com",
        coach: "Kaydence Quinn",
        trainingPlan: "https://onetrack.club/h477588722..."
    },
    {
        athlete: "Ashtyn Lamb",
        email: "ashtyn@email.com",
        coach: "Johanne Biles",
        trainingPlan: "https://onetrack.club/hhf882h2333..."
    },
    {
        athlete: "Alonzo Flores",
        email: "alonzo@email.com",
        coach: "Collin Odom",
        trainingPlan: "https://onetrack.club/sshd7746832..."
    },
    {
        athlete: "Marlene Soto",
        email: "marlenes@gmail.com",
        coach: "---",
        trainingPlan: "https://onetrack.club/run66573223..."
    },
    {
        athlete: "Raymon Villanueva",
        email: "raymonvillanueva@gmail.com",
        coach: "Kaydence Quinn",
        trainingPlan: "https://onetrack.club/23333212343..."
    },
    {
        athlete: "Ella Nichols",
        email: "ellanichols@gmail.com",
        coach: "Kaydence Quinn",
        trainingPlan: "https://onetrack.club/64353447636..."
    },
    {
        athlete: "Areli Jones",
        email: "arelijones@gmail.com",
        coach: "Johanne Biles",
        trainingPlan: "https://onetrack.club/32132135738..."
    },
    {
        athlete: "McKinley Cross",
        email: "mckinleycross@gmail.com",
        coach: "---",
        trainingPlan: "https://onetrack.club/55435435334..."
    },
    {
        athlete: "Ashanti Salas",
        email: "ashantiss@gmail.com",
        coach: "Collin Odom",
        trainingPlan: "https://onetrack.club/9983774344..."
    },
    {
        athlete: "Carolina Pugh",
        email: "cpugh@gmail.com",
        coach: "---",
        trainingPlan: "https://onetrack.club/7764646232..."
    },
    {
        athlete: "Nellie Coffey",
        email: "ncoffley@gmail.com",
        coach: "Collin Odom",
        trainingPlan: "https://onetrack.club/7673778838..."
    },
    {
        athlete: "Ernest Whitaker",
        email: "ernestwhitaker@gmail.com",
        coach: "---",
        trainingPlan: "https://onetrack.club/33342132331..."
    },
    {
        athlete: "Phyllis Ellis",
        email: "phylisellis@gmail.com",
        coach: "Johanne Biles",
        trainingPlan: "https://onetrack.club/77643233345..."
    },
    {
        athlete: "Rosella Dyer",
        email: "rosella.dyer@gmail.com",
        coach: "Johanne Biles",
        trainingPlan: "https://onetrack.club/43423433321..."
    },
    {
        athlete: "Isaac Watkins",
        email: "isaacwatkins@gmail.com",
        coach: "Kaydence Quinn",
        trainingPlan: "https://onetrack.club/34322233322..."
    },
];
const Template: StoryFn<typeof TableComponent> = (args) => (
    <TableComponent {...args} />
);

const props = {
    headers: [
        { key: 'athlete', label: 'Athlete' },
        { key: 'email', label: 'Email' },
        { key: 'coach', label: 'Coach' },
        { key: 'trainingPlan', label: 'Training Plan' },
        { key: 'actions', label: 'Actions' }
    ],
    list: list.map(item => ({
        ...item,
        trainingPlanComponent: <div>
            <div className='flex items-center gap-2'>
                <Attach className='w-4 h-4' />
                <Typography variant='body2-link'>{item.trainingPlan}</Typography>
            </div>
        </div>,
        actionsComponent: <div>
            <div className='flex items-center gap-2'>
                <Typography variant='body2-link'>Edit</Typography>
                <Typography variant='body2-link'>Delete</Typography>
            </div>
        </div>
    })),
};

export const Table = Template.bind({});
Table.args = {
    withPagination: true,
    showDisplayPerPage: false,
    totalItems: list.length,
    sortKeys: [
        'athlete',
        'email',
        'coach'
    ],
    ...props
};

export const LoadingTable = Template.bind({});
LoadingTable.args = {
    withPagination: true,
    isLoadingData: true,
    loaderSize: 10,
    ...props
};

export const NoTotalItems = Template.bind({});
NoTotalItems.args = {
    withPagination: true,
    ...props
};