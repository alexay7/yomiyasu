import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";

function NewBooksScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:recentBooks, refetch:recentRefetch} = useQuery("recentbooks", async()=> {
        const res = await api.get<BookWithProgress[]>("books?sort=!_id&limit=15");
        return res;
    }, {refetchOnWindowFocus:false});

    useEffect(()=>{
        async function refetchBooks():Promise<void> {
            await Promise.all([
                recentRefetch()
            ]);
        }

        if (reloaded && reloaded !== "reviews") {
            setTimeout(()=>{
                void refetchBooks();
            }, 1000);
        }
    }, [recentRefetch, reloaded]);

    if (!recentBooks || recentBooks.length === 0) return <></>;

    return (
        <ComponentScroller type="books" title="Libros nuevos" components={recentBooks}/>
    );
}

export default NewBooksScroller;