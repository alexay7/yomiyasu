import React from "react";
import {Spinner} from "../../ui/Spinner";

export function Loading():React.ReactElement {
    return (
        <div className="flex h-[100svh] items-center justify-center dark:bg-app-bg">
            <div className="flex flex-col items-center gap-4" role="status" aria-label="Cargando">
                <p className="animate-pulse text-5xl font-bold text-primary">YomiYasu</p>
                <Spinner size={20} className="text-fg-muted" />
            </div>
        </div>
    );
}
