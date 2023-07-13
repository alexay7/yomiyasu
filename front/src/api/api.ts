import {HttpError} from "../types/error";

async function request<TResponse>(url:string, config:RequestInit):Promise<TResponse> {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/${url}`, config);
    if (response.status > 399) {
        const errorData = await response.json() as {status:"ACCESS" | "REFRESH" | "NONE"};
        throw new HttpError(response.statusText, response.status, errorData.status);
    }
    return response.json() as TResponse;
}

export const api = {
    get: <TResponse>(url: string):Promise<TResponse> =>
        request<TResponse>(url, {method:"GET"}),

    post: <TBody, TResponse>(url: string, body: TBody):Promise<TResponse> =>
        request<TResponse>(url, {method: "POST", body:JSON.stringify(body), headers:{"Content-Type":"application/json"}})
};