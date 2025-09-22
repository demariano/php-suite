import { CreateUserDto, MessageQueueDto, UsersDto } from "@dto";
import { AxiosConfig } from "./axiosConfig";

class UserApi extends AxiosConfig {
    constructor() {
        // TODO set shouldRedirectUnauthorized = true
        super('API_USER_URL', true, false);
    }

    public getUserById = async (id: string): Promise<UsersDto> => {
        return await this.axiosInstance.get(`/${id}`);
    };

    public createUser = async (params: CreateUserDto): Promise<MessageQueueDto<CreateUserDto>> => {
        return await this.axiosInstance.post('/', params);
    };
}

export default new UserApi();
