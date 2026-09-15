import {ErrorOutline} from "@mui/icons-material";
import {Button, Skeleton} from "@mui/material";
import React from "react";

export function SerieCardSkeleton():React.ReactElement {
    return (
        <div className="w-[9rem] flex-shrink-0">
            <Skeleton variant="rectangular" animation="wave" className="h-[13rem] rounded-sm"/>
            <div className="dark:bg-app-surface bg-white flex flex-col px-2 pt-3 pb-1 rounded-b">
                <Skeleton variant="text" animation="wave" className="h-12"/>
                <div className="flex items-center justify-between py-1">
                    <Skeleton variant="text" animation="wave" width={60}/>
                    <Skeleton variant="circular" animation="wave" width={24} height={24}/>
                </div>
            </div>
        </div>
    );
}

export function LibraryGridSkeleton({count}:{count:number}):React.ReactElement {
    return (
        <div className="flex w-full items-center justify-center">
            <ul className="flex flex-wrap p-8 py-4 gap-4">
                {Array.from({length: count}).map((_, index)=>(
                    <li key={index}>
                        <SerieCardSkeleton/>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function ScrollerSkeleton({title, count = 8}:{title:string, count?:number}):React.ReactElement {
    return (
        <div>
            <h2>{title}</h2>
            <ul className="lg:px-4 flex gap-8 flex-nowrap overflow-hidden py-4">
                {Array.from({length: count}).map((_, index)=>(
                    <li key={index}>
                        <SerieCardSkeleton/>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function SectionError({message, onRetry}:{message:string, onRetry:()=>void}):React.ReactElement {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <ErrorOutline className="w-16 h-16" color="error"/>
            <p className="text-xl dark:text-white">{message}</p>
            <Button variant="outlined" onClick={onRetry}>Reintentar</Button>
        </div>
    );
}

export function SeriePageSkeleton():React.ReactElement {
    return (
        <div className="px-8 pt-8">
            <div className="flex gap-8 flex-col lg:flex-row">
                <Skeleton variant="rectangular" animation="wave" className="w-[14rem] h-[20rem] rounded-sm"/>
                <div className="flex flex-col gap-4 w-full max-w-xl">
                    <Skeleton variant="text" animation="wave" className="h-12 w-2/3"/>
                    <Skeleton variant="rectangular" animation="wave" className="h-8 w-32 rounded"/>
                    <Skeleton variant="text" animation="wave" className="w-1/2"/>
                    <Skeleton variant="rectangular" animation="wave" className="h-10 w-40 rounded"/>
                </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-8">
                {Array.from({length: 8}).map((_, index)=>(
                    <SerieCardSkeleton key={index}/>
                ))}
            </div>
        </div>
    );
}
