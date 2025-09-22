import { CognitoCompleteNewPasswordDto, CognitoConfirmCodeDto, CognitoDto, CognitoEmailDto, CognitoVerifyMfaDto } from "@dto";
import { AxiosConfig } from "./axiosConfig";

class AuthApi extends AxiosConfig {
    constructor() {
        super('API_AUTHENTICATION_URL', false, false);
    }

    public login = async <T>(params: CognitoDto): Promise<T> => {
        return await this.axiosInstance.post(`/login`, params);
    };

    public verifyMfa = async <T>(params: CognitoVerifyMfaDto): Promise<T> => {
        return await this.axiosInstance.post(`/verify-mfa`, params);
    }

    public createUser = async (params: CognitoDto): Promise<CognitoDto> => {
        return await this.axiosInstance.post(`/admin-create-user`, params);
    }

    public completeNewPassword = async <T>(params: CognitoCompleteNewPasswordDto): Promise<T> => {
        return await this.axiosInstance.post(`/complete-new-password`, params);
    }

    public forgotPassword = async <T>(params: CognitoEmailDto): Promise<T> => {
        return await this.axiosInstance.post(`/forgot-password`, params);
    }

    public confirmPasswordCode = async (params: CognitoConfirmCodeDto): Promise<CognitoConfirmCodeDto> => {
        return await this.axiosInstance.post(`/confirm-password-code`, params);
    }

    public resendConfirmationCode = async (params: CognitoEmailDto): Promise<CognitoEmailDto> => {
        return await this.axiosInstance.post(`/resend-confirmation-code`, params);
    }
}

export default new AuthApi();
