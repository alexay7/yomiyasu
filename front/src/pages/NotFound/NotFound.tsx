import {SearchOff} from "@mui/icons-material";
import {Button} from "@mui/material";
import React from "react";
import {Helmet} from "react-helmet";
import {Link} from "react-router-dom";

export default function NotFound():React.ReactElement {
    return (
        <div className="flex flex-col items-center justify-center gap-4 h-[100svh] dark:bg-app-bg text-center px-4">
            <Helmet>
                <title>YomiYasu - Página no encontrada</title>
            </Helmet>
            <SearchOff className="w-32 h-32" color="primary"/>
            <h1 className="text-4xl dark:text-white">Página no encontrada</h1>
            <p className="text-lg dark:text-gray-300">La página que buscas no existe o ha sido movida.</p>
            <Link to="/app">
                <Button variant="contained">Volver al inicio</Button>
            </Link>
        </div>
    );
}
