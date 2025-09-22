import { UserApi } from '@data-access/api';
import { useQuery } from '@tanstack/react-query';

const useQueryUserById = (userId: string) => {
    return useQuery({
        queryKey: ['user', userId],
        queryFn: () => UserApi.getUserById(userId),
        enabled: !!userId
    })
}

export default useQueryUserById;