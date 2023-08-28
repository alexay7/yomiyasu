import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";
import {SerieWithProgress} from "../../../types/serie";

function ReadLaterScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:readlist, refetch:readlistRefetch} = useQuery("readlist", async()=> {
        const res = await api.get<SerieWithProgress[]>("series/readlist");
        return res;
    });

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await Promise.all([
                readlistRefetch()
            ]);
        }

        if (reloaded && reloaded !== "reviews") {
            setTimeout(()=>{
                void refetchBooks();
            }, 1000);
        }
    }, [readlistRefetch, reloaded]);

    if (!readlist || readlist.length === 0) return <></>;

    return (
        <ComponentScroller type="series" title="&quot;Leer más tarde&quot;" components={readlist}/>
    );
}

export default ReadLaterScroller;