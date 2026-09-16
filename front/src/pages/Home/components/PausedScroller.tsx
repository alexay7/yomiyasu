import React from "react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {SectionError, ScrollerSkeleton} from "../../../components/Skeletons/Skeletons";
import {SerieWithProgress} from "../../../types/serie";
import {keys} from "../../../lib/queryKeys";

interface PausedScrollerProps {
    variant:"manga" | "novela";
}

function PausedScroller({variant}:PausedScrollerProps):React.ReactElement {
    const {data:paused, refetch:pausedRefetch, isLoading, isError} = useQuery({
        queryKey:keys.paused(variant),
        queryFn:async()=> {
            return api.get<SerieWithProgress[]>(`series/${variant}/paused`);
        }
    });

    if (isLoading) return <ScrollerSkeleton title={`Pausadas (${variant})`}/>;

    if (isError) {
        return <SectionError message="No se pudo cargar la lista de series pausadas" onRetry={()=>{
            void pausedRefetch();
        }}/>;
    }

    if (!paused || paused.length === 0) return <></>;

    return (
        <ComponentScroller type="series" title={`Pausadas (${variant})`} components={paused} noVariantIndicator/>
    );
}

export default PausedScroller;
