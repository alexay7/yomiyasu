import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";
import {SeriesFilter} from "../../../types/serie";

function RecentSeriesScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:recentSeries, refetch:recentSeriesRefetch} = useQuery("recentseries", async()=> {
        const res = await api.get<SeriesFilter>("series?sort=!lastModifiedDate&limit=15");
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
        <ComponentScroller type="series" title="Series con volúmenes nuevos" components={recentSeries}/>
    );
}

export default RecentSeriesScroller;