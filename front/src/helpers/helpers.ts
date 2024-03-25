import {NavigateFunction} from "react-router-dom";
import {api} from "../api/api";
import {RefreshResponse} from "../types/responses";
import {setCookie} from "./cookies";

function addLeadingZero(value: number): string {
    return value.toString().padStart(2, "0");
}

export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedHours = addLeadingZero(hours);
    const formattedMinutes = addLeadingZero(minutes);
    const formattedSeconds = addLeadingZero(remainingSeconds);

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

export async function checkRefreshToken():Promise<RefreshResponse> {
    const uuid = window.localStorage.getItem("uuid");
    try {
        const response = await api.post<{uuid: string}, RefreshResponse>("auth/refresh", {uuid:uuid || ""});

        if (!response) return {status:"fail", uuid:""};

        setCookie("logged", "true", 2);
        return response;
    } catch {
        return {status:"fail", uuid:""};
    }
}

export function goTo(navigate:NavigateFunction, link:string):void {
    let origin = window.location.pathname.replace("login", "");

    if (origin.includes("reader") || origin.includes("ranobe")) {
        origin = "/";
    }

    window.localStorage.setItem("origin", origin);
    navigate(link);
}

export function goBack(navigate:NavigateFunction):void {
    let origin = window.localStorage.getItem("origin") || "/";
    if (origin === window.location.pathname) {
        origin = "/";
    }
    navigate(origin);
}

export function convertBase64(file:File):Promise<string | ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);
        fileReader.onload = () => {
            resolve(fileReader.result);
        };
        fileReader.onerror = (error) => {
            reject(error);
        };
    });
}