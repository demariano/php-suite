'use client';

import { Button, Input, Tab, Typography } from '@components-web';
import { useSecrets } from '@data-access/hooks/useSecrets';
import useWebsocket from '@data-access/hooks/useWebSocket';
import { useState } from 'react';

const DashboardPage = () => {
    const [message, setMessage] = useState('test message');
    const { sendMessage, isConnected } = useWebsocket();
    const { getSecret } = useSecrets();

    const handleClick = async () => {
        const secret = await getSecret('TEST');
        if (secret) {
            console.log('Secret value:', secret);
        }
    };

    return (
        <div className='space-y-10'>
            <Typography variant='h2'>
                DashboardPage
            </Typography>

            <div>
                <Tab
                    options={[
                        { label: 'Athletes', value: 'athletes' },
                        { label: 'Coaches', value: 'coaches' }
                    ]}
                    activeTab='athletes'
                    onChange={() => {
                        // TODO: Implement tab change
                    }} />
            </div>

            <div className='flex gap-2 items-center'>
                <Input
                    value={message}
                    onChange={(val) => setMessage(val as string)}
                />
                <Button onClick={() => {
                    sendMessage(message);
                }} label='Send WebSocket Message' />
            </div>
            <Typography>WebSocket Connected: {isConnected ? '✅ Yes' : '❌ No'}</Typography>

            <Button onClick={handleClick} label='Get Secret' />
        </div>
    )
}

export default DashboardPage;