import { AxiosResponse } from 'axios';

export interface ResponseError extends Error {
    response: AxiosResponse
}
