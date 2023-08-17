import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";

function TableroScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:tableroData, refetch:tableroRefetch} = useQuery("tablero", async()=> {
        const res = await api.get<BookWithProgress[]>("readprogress/tablero");
        return res;
    }, {refetchOnWindowFocus:false});

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await Promise.all([
                tableroRefetch()
            ]);
        }

        if (reloaded && reloaded !== "reviews") {
            setTimeout(()=>{
                void refetchBooks();
            }, 1000);
        }
    }, [tableroRefetch, reloaded]);

    if (!tableroData || tableroData.length === 0) return <></>;

    return (
        <ComponentScroller type="books" title="Tu tablero" components={tableroData} deck/>
    );
}

export default TableroScroller;