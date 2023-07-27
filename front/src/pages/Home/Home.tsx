import React, {useEffect} from "react";
import {api} from "../../api/api";
import {useQuery} from "react-query";
import {BookWithProgress} from "../../types/book";
import {useGlobal} from "../../contexts/GlobalContext";
import {ComponentScroller} from "../../components/ComponentScroller/ComponentScroller";

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

    const {data:recentBooks, refetch:recentRefetch} = useQuery("recentbooks", async()=> {
        const res = await api.get<BookWithProgress[]>("books?sort=createdDate");
        return res;
    }, {refetchOnWindowFocus:false});

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await progressRefetch();
            await tableroRefetch();
            await recentRefetch();
        }

        if (reloaded) {
            void refetchBooks();
        }
    }, [progressRefetch, tableroRefetch, recentRefetch, reloaded]);

    return (
        <div className="bg-[#121212] overflow-x-hidden">
            <div className="text-white px-8 py-4 flex flex-col gap-4">
                {progresoData && progresoData.length > 0 && (
                    <ComponentScroller title="En progreso" components={progresoData}/>
                )}
                {tableroData && tableroData.length > 0 && (
                    <ComponentScroller title="Tablero" components={tableroData}/>
                )}
                {recentBooks && recentBooks.length > 0 && (
                    <ComponentScroller title="Añadidos recientemente" components={recentBooks}/>
                )}
            </div>
        </div>
    );
}