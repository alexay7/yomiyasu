import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";
import {SeriesFilter} from "../../../types/serie";

function NewSeriesScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:newSeries = [], refetch:newSeriesRefetch} = useQuery("newseries", async()=> {
        const res = await api.get<SeriesFilter>("series?sort=!_id&limit=15");

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

    if (!newSeries || newSeries.length === 0) return <></>;

    return (
        <ComponentScroller type="series" title="Series nuevas" components={newSeries}/>
    );
}

export default NewSeriesScroller;