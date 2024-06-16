import {ProtectedRoute} from "./ProtectedRoute";
import React from "react";

interface ProtectedLayoutProps {
    children:React.JSX.Element
}

export default function ProtectedLayout(props:ProtectedLayoutProps):React.ReactElement {
    const {children} = props;

    return (
        <ProtectedRoute>
            {children}
        </ProtectedRoute>
    );
}