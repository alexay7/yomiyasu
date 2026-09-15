import React from "react";
import {Navigate, useLocation} from "react-router";
import {useAuth} from "../../contexts/AuthContext";
import {Loading} from "../../pages/Loading/Loading";

interface ProtectedRouteProps {
    children:React.JSX.Element
}

export function ProtectedRoute(props:ProtectedRouteProps):React.ReactElement {
    const {loggedIn, loading} = useAuth();
    const {children} = props;
    const location = useLocation();

    if (loading) {
        // Todavía no sabemos si tenemos los datos del usuario
        return <Loading/>;
    }

    if (!loggedIn) {
    // El usuario no ha iniciado sesión; recordar el destino para volver tras el login
        return <Navigate to="/login" state={{from:location.pathname + location.search}} replace/>;
    }
    return children;
}
