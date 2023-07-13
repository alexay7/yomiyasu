import {Outlet} from "react-router-dom";
import {ProtectedRoute} from "./ProtectedRoute";
import React from "react";

export function ProtectedLayout():React.ReactElement {
    return (
        <ProtectedRoute>
            <Outlet/>
        </ProtectedRoute>
    );
}