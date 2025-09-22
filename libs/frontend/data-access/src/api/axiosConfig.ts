import { STORAGE_KEY } from '@utils/config/constants';
import axios, { AxiosInstance } from 'axios';
import Cookies from 'js-cookie';
import { EnvVariables, getEnv } from '../config/env';
import { ResponseError } from '../types/responseError';

export class AxiosConfig {
    protected axiosInstance: AxiosInstance;

    constructor(
        baseURLEnvVar: keyof EnvVariables | null,
        withAuthorization: boolean,
        shouldRedirectUnauthorized: boolean
    ) {
        this.axiosInstance = axios.create({
            baseURL: '',
            timeout: 150000,
            timeoutErrorMessage: 'Time out!',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        this.initializeBaseURL(baseURLEnvVar);
        this.addInterceptor(
            this.axiosInstance,
            withAuthorization,
            shouldRedirectUnauthorized
        );
    }

    private async initializeBaseURL(envVar: keyof EnvVariables | null) {
        if (!envVar) return;

        const env = await getEnv();
        this.axiosInstance.defaults.baseURL = env[envVar];
    }

    protected addInterceptor(
        instance: AxiosInstance,
        withAuthorization: boolean,
        shouldRedirectUnauthorized: boolean
    ): void {
        // console.log("🚀 ~ AxiosConfig ~ addInterceptor ~ instance:", instance)
        // instance.interceptors.request.use(async (config) => {
        //     console.log("🚀 ~ AxiosConfig ~ instance.interceptors.request.use ~ config:", config);
        //     if (config.url) {
        //         const url = new URL(config.url, config.baseURL);
        //         url.searchParams.append('processSNSqueue', 'false');
        //         config.url = url.toString();
        //     }

        //     console.log(config.url);
        //     return config;
        // }, async (error) => {
        //     return await Promise.reject(error);
        // });

        if (withAuthorization) {
            instance.interceptors.request.use(async (config) => {
                const accessToken = await this.getAccessTokenAsync();

                config.headers.Authorization = `Bearer ${accessToken}`;
                config.headers['sessionId'] = Cookies.get(STORAGE_KEY.SESSION_ID) || '';

                return config;
            }, async (error) => {
                return await Promise.reject(error);
            });
        }

        instance.interceptors.response.use(function (response) {
            if ([200, 201].includes(response.status)) {
                return { ...response.data.body, statusCode: response.data.statusCode };
            } else {
                const error: ResponseError = { ...new Error(response.statusText), response };

                throw error;
            }
        }, function (error) {
            if (shouldRedirectUnauthorized) {
                if (error?.response?.status === 401) {
                    window.location.href = '/auth/login';
                }
            }

            return Promise.reject(error);
        });
    }

    protected async getAccessTokenAsync(): Promise<string> {
        return sessionStorage.getItem(STORAGE_KEY.ACCESS_TOKEN) || Cookies.get(STORAGE_KEY.ACCESS_TOKEN) || '';
    }
}
