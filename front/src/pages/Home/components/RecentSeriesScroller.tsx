import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";
import {SeriesFilter} from "../../../types/serie";

interface RecentSeriesScrollerProps {
    variant:"manga" | "novela";
}

function RecentSeriesScroller({variant}:RecentSeriesScrollerProps):React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:recentSeries = [], refetch:recentSeriesRefetch} = useQuery(["recentseries", variant], async()=> {
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

    if (!recentSeries || recentSeries.length === 0) return <></>;

    return (
        <ComponentScroller variant={variant} type="series" title={`Series de ${variant === "manga" ? "manga" : "novelas"} con volúmenes nuevos`} components={recentSeries}/>
    );
}

export default RecentSeriesScroller;