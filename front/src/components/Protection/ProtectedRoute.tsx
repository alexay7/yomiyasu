import React from "react";
import {Navigate} from "react-router-dom";
import {useAuth} from "../../contexts/AuthContext";

interface ProtectedRouteProps {
    children:React.JSX.Element
}

export function ProtectedRoute(props:ProtectedRouteProps):React.ReactElement {
    const {loggedIn, loading} = useAuth();
    const {children} = props;

    if (loading) {
        // Todavía no sabemos si tenemos los datos del usuario
        return <p>Wait</p>;
    }

    if (!loggedIn) {
    // El usuario no ha iniciado sesión
        return <Navigate to="/login" />;
    }
    return children;
}