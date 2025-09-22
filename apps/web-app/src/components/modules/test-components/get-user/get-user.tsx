'use client';

import { Button } from "@components-web";
import { useState } from "react";
import useQueryUserById from "./useQueryUserById";

const GetUser = () => {
    const [userId, setUserId] = useState('');

    const { data, isLoading, isFetching } = useQueryUserById(userId);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formData = new FormData(event.target as HTMLFormElement);
        const userId = formData.get('userId') as string;

        setUserId(userId);
    }

    return (
        <div>
            <form onSubmit={handleSubmit} className='flex'>
                <input placeholder='user id' name='userId' />
                <Button label='Get by user id' isProcessing={isLoading || isFetching} type='submit' />
            </form>

            {data && (
                <pre className='prose'>
                    {JSON.stringify(data, null, 2)}
                </pre>
            )}
        </div>
    )
}

export default GetUser;