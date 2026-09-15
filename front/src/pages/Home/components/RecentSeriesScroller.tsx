import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {SectionError, ScrollerSkeleton} from "../../../components/Skeletons/Skeletons";
import {useGlobal} from "../../../contexts/GlobalContext";
import {SeriesFilter} from "../../../types/serie";

interface RecentSeriesScrollerProps {
    variant:"manga" | "novela";
}

function RecentSeriesScroller({variant}:RecentSeriesScrollerProps):React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:recentSeries = [], refetch:recentSeriesRefetch, isLoading, isError} = useQuery(["recentseries", variant], async()=> {
        const res = await api.get<SeriesFilter>(`series/${variant}?sort=!lastModifiedDate&limit=15`);

        if (!res) return [];

        return res.data;
    });

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await Promise.all([
                recentSeriesRefetch()
            ]);
        }

        if (reloaded && reloaded !== "reviews") {
            setTimeout(()=>{
                void refetchBooks();
            }, 1000);
        }
    }, [recentSeriesRefetch, reloaded]);

    const title = `Series de ${variant === "manga" ? "manga" : "novelas"} con volúmenes nuevos`;

    if (isLoading) return <ScrollerSkeleton title={title}/>;

    if (isError) {
        return <SectionError message="No se pudieron cargar las series con volúmenes nuevos" onRetry={()=>{
            void recentSeriesRefetch();
        }}/>;
    }

    if (recentSeries.length === 0) return <></>;

    return (
        <ComponentScroller variant={variant} type="series" title={title} components={recentSeries} noVariantIndicator/>
    );
}

export default RecentSeriesScroller;