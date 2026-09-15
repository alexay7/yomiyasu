import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {SectionError, ScrollerSkeleton} from "../../../components/Skeletons/Skeletons";
import {useGlobal} from "../../../contexts/GlobalContext";
import {SeriesFilter} from "../../../types/serie";

interface NewSeriesScrollerProps {
    variant:"manga" | "novela";
}

function NewSeriesScroller({variant}:NewSeriesScrollerProps):React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:newSeries = [], refetch:newSeriesRefetch, isLoading, isError} = useQuery(["newseries", variant], async()=> {
        const res = await api.get<SeriesFilter>(`series/${variant}?sort=!_id&limit=15`);

        if (!res) return [];

        return res.data;
    });

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await Promise.all([
                newSeriesRefetch()
            ]);
        }

        if (reloaded && reloaded !== "reviews") {
            setTimeout(()=>{
                void refetchBooks();
            }, 1000);
        }
    }, [newSeriesRefetch, reloaded]);

    const title = `Series de ${variant === "manga" ? "manga" : "novelas"} nuevas`;

    if (isLoading) return <ScrollerSkeleton title={title}/>;

    if (isError) {
        return <SectionError message="No se pudieron cargar las series nuevas" onRetry={()=>{
            void newSeriesRefetch();
        }}/>;
    }

    if (newSeries.length === 0) return <></>;

    return (
        <ComponentScroller variant={variant} type="series" title={title} components={newSeries} noVariantIndicator/>
    );
}

export default NewSeriesScroller;