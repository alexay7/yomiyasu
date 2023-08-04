import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";

function ProgressScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:progresoData, refetch:progressRefetch} = useQuery("progreso", async()=> {
        const res = await api.get<BookWithProgress[]>("readprogress/reading");
        return res;
    }, {refetchOnWindowFocus:false});

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await Promise.all([
                progressRefetch()
            ]);
        }

        if (reloaded && reloaded !== "reviews") {
            setTimeout(()=>{
                void refetchBooks();
            }, 1000);
        }
    }, [progressRefetch, reloaded]);

    if (!progresoData || progresoData.length === 0) return <></>;

    return (
        <ComponentScroller type="books" title="En progreso" components={progresoData}/>
    );
}

export default ProgressScroller;