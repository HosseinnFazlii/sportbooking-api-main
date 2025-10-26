// src/types/response.ts
export interface IApiResponse<T> {
    data: T;
    error?: string;
}