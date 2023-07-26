import {LinearProgress} from "@mui/material";
import React from "react";

export function Loading():React.ReactElement {
    return (
        <div className="h-screen bg-[#121212] flex justify-center items-center">
            <div className="flex flex-col gap-8">
                <p className="text-6xl text-primary font-bold animate-pulse">YomiYasu</p>
                <LinearProgress className="w-full"/>
            </div>
        </div>
    );
}