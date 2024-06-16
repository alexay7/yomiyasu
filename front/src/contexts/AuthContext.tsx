import React, {createContext, useContext, useEffect, useState} from "react";
import {LoggedUser, LoginUser, RegisterUser} from "./../types/user";
import {api} from "../api/api";
import {AuthResponse} from "../types/responses";
import {HttpError} from "../types/error";
import {toast} from "react-toastify";
import {checkRefreshToken} from "../helpers/helpers";
import {setCookie} from "../helpers/cookies";

export interface ContextProps {
    children?:React.ReactNode
}

type AuthContextType = {
    userData:LoggedUser | undefined;
    loggedIn:boolean;
    loading:boolean;
    registerUser:(username:string, email:string, password:string)=>Promise<AuthResponse | undefined>;
    loginUser:(usernameOrEmail:string, password:string)=>Promise<AuthResponse | undefined>;
    logoutUser:()=>Promise<void>;
    reauth:(v:boolean)=>void;
};

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);
export function useAuth():AuthContextType {
    return useContext(AuthContext);
}

export function AuthProvider(props:ContextProps):React.ReactElement {
    const {children} = props;
    const [userData, setUserData] = useState<LoggedUser | undefined>();
    const [loggedIn, setLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [reauth, setReauth] = useState(true);

    async function registerUser(username:string, email:string, password:string):Promise<AuthResponse | undefined> {
        const body = {username, email, password};
        try {
            const response = await api.post<RegisterUser, AuthResponse>("auth/signup", body);

            return response;
        } catch (e) {
            setLoading(false);
            toast.error("No se pudo registrar al usuario");
        }
    }

    async function loginUser(usernameOrEmail:string, password:string):Promise<AuthResponse | undefined> {
        // Get uuid if it exists
        const uuid = window.localStorage.getItem("uuid");
        const body = {usernameOrEmail, password, uuid};
        setLoading(true);

        try {
            const response = await api.post<LoginUser, AuthResponse>("auth/login", body);

            if (!response) {
                setLoading(false);
                return;
            }

            setUserData(response.user);
            setLoggedIn(true);
            setLoading(false);
            setReauth(false);

            // El backend ha generado un uuid para este dispositivo, guardarlo en el localstorage para refrescar el token
            window.localStorage.setItem("uuid", response.uuid);
            return response;
        } catch (e) {
            setLoading(false);
            toast.error("No se encontró la combinación de correo/usuario y contraseña");
        }
    }

    async function logoutUser():Promise<void> {
        // Get uuid if it exists
        setLoading(true);
        const uuid = window.localStorage.getItem("uuid") || "";
        await api.post<{uuid:string}, void>("auth/logout", {uuid});
        setUserData(undefined);
        setLoggedIn(false);
        setLoading(false);
    }

    // Renueva el token de acceso cada hora
    useEffect(()=>{
        const interval = setInterval(async()=>{
            await checkRefreshToken();
        }, 1000 * 60 * 60);
        return ()=>clearInterval(interval);
    }, []);

    useEffect(()=>{
        /**
         * Este useEffect se encarga de validar el estado de autenticación del usuario cada vez que
         * abra/recargue la página
         */
        async function checkAccessToken():Promise<LoggedUser | undefined> {
            const response = await api.get<LoggedUser>("auth/me");

            if (!response) {
                return;
            }

            setCookie("logged", "true", 2);
            return response;
        }

        async function checkAuth():Promise<void> {
            if (window.location.pathname === "/login") {
                setLoggedIn(false);
                setLoading(false);
                return;
            }

            /**
             * Nada más llegue el usuario a la página renovarle el token, esto es para evitar casos en los que
             * el usuario recargue la página antes de que se renueve el token (cada hora) y provocando así que
             * le caduque.
             */
            try {
                await checkRefreshToken();
            } catch {
                setLoading(true);
            }

            try {
                const myData = await checkAccessToken();

                // No hay excepción, el usuario tenía un token de acceso
                setUserData(myData);
                setLoggedIn(true);
                setLoading(false);
            } catch (e) {
                // Excepción encontrada, se comprueba si es por 401
                const error = e as HttpError;

                if (error.status !== 401 || error.tokenStatus !== "REFRESH") {
                    // Otra cosa ha causado la excepción o no existe token de refresco, interrumpir login
                    setLoggedIn(false);
                    setLoading(false);
                    return;
                }
                // Excepción 401, se prueba a refrescar el access token con el refresh token
                try {
                    await checkRefreshToken();

                    // El resfresh token no ha causado excepción, se comprueba si el nuevo access token funciona
                    const myData = await checkAccessToken();

                    // No hay excepción, el access token es válido
                    setUserData(myData);
                    setLoggedIn(true);
                    setLoading(false);
                } catch (refreshError) {
                    // Excepción, independientemente del tipo que sea, interrumpir login
                    setLoggedIn(false);
                    setLoading(false);
                }
            }
        }
        void checkAuth();
    }, [reauth]);

    return (
        <AuthContext.Provider value={{
            userData:userData,
            registerUser:registerUser,
            loginUser:loginUser,
            loggedIn:loggedIn,
            loading:loading,
            logoutUser:logoutUser,
            reauth:setReauth
        }}
        >
            {children}
        </AuthContext.Provider>
    );
}