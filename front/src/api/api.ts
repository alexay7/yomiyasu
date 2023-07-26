import {toast} from "react-toastify";
import {checkRefreshToken} from "../helpers/helpers";
import {HttpError} from "../types/error";

async function request<TResponse>(url:string, config:RequestInit):Promise<TResponse> {
    const response = await fetch(`/api/${url}`, config);

    if (response.status > 399) {
        const errorData = await response.json() as {status:"ACCESS" | "REFRESH" | "NONE"};
        if (response.status === 403) {
            toast.error("No tienes permisos para realizar esa acción");
        }

        if (response.status === 401 && !url.includes("auth")) {
            try {
                await checkRefreshToken();
                const responseSecondTry = await fetch(`/api/${url}`, config);
                if (responseSecondTry) {
                    return responseSecondTry.json() as TResponse;
                }
            } catch {
                window.location.href = "/";
            }
        }

        throw new HttpError(response.statusText, response.status, errorData.status);
    }
    return response.json() as TResponse;
}

export const api = {
    get: <TResponse>(url: string):Promise<TResponse> =>
        request<TResponse>(url, {method:"GET"}),

    post: <TBody, TResponse>(url: string, body: TBody, keepAlive?:boolean):Promise<TResponse> =>
        request<TResponse>(url, {method: "POST", body:JSON.stringify(body), headers:{"Content-Type":"application/json"}, keepalive:keepAlive}),

    patch: <TBody, TResponse>(url: string, body: TBody, keepAlive?:boolean):Promise<TResponse> =>
        request<TResponse>(url, {method: "PATCH", body:JSON.stringify(body), headers:{"Content-Type":"application/json"}, keepalive:keepAlive})
};