import {LinearProgress} from "@mui/material";
import React from "react";
import {Helmet} from "react-helmet";

export function Loading():React.ReactElement {
    return (
        <div className="h-[100svh] dark:bg-[#121212] flex justify-center items-center">
            <Helmet>
                <title>YomiYasu - Cargando...</title>
            </Helmet>
            <div className="flex flex-col gap-8">
                <p className="text-6xl text-primary font-bold animate-pulse">YomiYasu</p>
                <LinearProgress color="primary" className="w-full"/>
            </div>
        </div>
    );
}