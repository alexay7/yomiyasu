import React, {useEffect} from "react";
import {api} from "../../api/api";
import {useQuery} from "react-query";
import {BookWithProgress} from "../../types/book";
import {useGlobal} from "../../contexts/GlobalContext";
import {ComponentScroller} from "../../components/ComponentScroller/ComponentScroller";
import {SerieWithProgress, SeriesFilter} from "../../types/serie";

export function Home():React.ReactElement {
    const {reloaded} = useGlobal();

    const {data:progresoData, refetch:progressRefetch} = useQuery("progreso", async()=> {
        const res = await api.get<BookWithProgress[]>("books?status=reading");
        return res;
    }, {refetchOnWindowFocus:false});

    const {data:tableroData, refetch:tableroRefetch} = useQuery("tablero", async()=> {
        const res = await api.get<BookWithProgress[]>("readprogress/tablero");
        return res;
    }, {refetchOnWindowFocus:false});

    const {data:readlist, refetch:readlistRefetch} = useQuery("readlist", async()=> {
        const res = await api.get<SerieWithProgress[]>("series/readlist");
        return res;
    }, {refetchOnWindowFocus:false});

    const {data:recentBooks, refetch:recentRefetch} = useQuery("recentbooks", async()=> {
        const res = await api.get<BookWithProgress[]>("books?sort=!createdDate&limit=15");
        return res;
    }, {refetchOnWindowFocus:false});

    const {data:recentSeries, refetch:recentSeriesRefetch} = useQuery("recentseries", async()=> {
        const res = await api.get<SeriesFilter>("series?sort=!lastModifiedDate&limit=15");
        return res.data;
    }, {refetchOnWindowFocus:false});

    const {data:newSeries, refetch:newSeriesRefetch} = useQuery("newseries", async()=> {
        const res = await api.get<SeriesFilter>("series?sort=!createdDate&limit=15");
        return res.data;
    }, {refetchOnWindowFocus:false});

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await Promise.all([
                progressRefetch(),
                tableroRefetch(),
                recentRefetch(),
                recentSeriesRefetch(),
                newSeriesRefetch(),
                readlistRefetch()
            ]);
        }

        if (reloaded && reloaded !== "reviews") {
            setTimeout(()=>{
                void refetchBooks();
            }, 1000);
        }
    }, [progressRefetch, tableroRefetch, recentRefetch,
        recentSeriesRefetch, newSeriesRefetch, readlistRefetch,
        reloaded]);

    return (
        <div className="bg-[#121212] overflow-x-hidden">
            <div className="text-white px-8 py-4 flex flex-col gap-4">
                {progresoData && progresoData.length > 0 && (
                    <ComponentScroller type="books" title="En progreso" components={progresoData}/>
                )}
                {tableroData && tableroData.length > 0 && (
                    <ComponentScroller type="books" title="Tu tablero" components={tableroData}/>
                )}
                {readlist && readlist.length > 0 && (
                    <ComponentScroller type="series" title="&quot;Leer más tarde&quot;" components={readlist}/>
                )}
                {recentBooks && recentBooks.length > 0 && (
                    <ComponentScroller type="books" title="Libros nuevos" components={recentBooks}/>
                )}
                {newSeries && newSeries.length > 0 && (
                    <ComponentScroller type="series" title="Series nuevas" components={newSeries}/>
                )}
                {recentSeries && recentSeries.length > 0 && (
                    <ComponentScroller type="series" title="Series con volúmenes nuevos" components={recentSeries}/>
                )}
            </div>
        </div>
    );
}