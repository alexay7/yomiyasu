import React from "react";
import {useQuery} from "@tanstack/react-query";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {SectionError, ScrollerSkeleton} from "../../../components/Skeletons/Skeletons";
import {SerieWithProgress} from "../../../types/serie";
import {keys} from "../../../lib/queryKeys";

interface ReadLaterScrollerProps {
    variant:"manga" | "novela";
}

function ReadLaterScroller({variant}:ReadLaterScrollerProps):React.ReactElement {
    const {data:readlist, refetch:readlistRefetch, isLoading, isError} = useQuery({
        queryKey:keys.readlist(variant),
        queryFn:async()=> {
            return api.get<SerieWithProgress[]>(`series/${variant}/readlist`);
        }
    });

    if (isLoading) return <ScrollerSkeleton title={`"Leer más tarde" ${variant}`}/>;

    if (isError) {
        return <SectionError message="No se pudo cargar la lista de lectura más tarde" onRetry={()=>{
            void readlistRefetch();
        }}/>;
    }

    if (!readlist || readlist.length === 0) return <></>;

    return (
        <ComponentScroller type="series" title={`"Leer más tarde" ${variant}`} components={readlist} noVariantIndicator/>
    );
}

export default ReadLaterScroller;
