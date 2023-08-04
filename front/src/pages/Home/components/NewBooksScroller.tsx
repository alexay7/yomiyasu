import React, {useEffect} from "react";
import {useQuery} from "react-query";
import {BookWithProgress} from "../../../types/book";
import {api} from "../../../api/api";
import {ComponentScroller} from "../../../components/ComponentScroller/ComponentScroller";
import {useGlobal} from "../../../contexts/GlobalContext";
import {RestorePage} from "@mui/icons-material";

function NewBooksScroller():React.ReactElement {
    const {reloaded} = useGlobal();
    const {data:recentBooks, refetch:recentRefetch, isLoading} = useQuery("recentbooks", async()=> {
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

    if (!isLoading) {
        if (!recentBooks || recentBooks.length === 0) {
            return (
                <div className="flex items-center flex-col py-8 justify-center text-center">
                    <RestorePage className="w-40 h-40" color="primary"/>
                    <p className="text-3xl dark:text-white">Esta biblioteca está vacía...</p>
                </div>
            );
        }
    }

    if (!recentBooks) return <></>;

    return (
        <ComponentScroller type="books" title="Libros nuevos" components={recentBooks}/>
    );
}

export default NewBooksScroller;