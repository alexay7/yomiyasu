import React, {Fragment} from "react";
import {api} from "../../api/api";
import {useQuery} from "react-query";
import {BookWithProgress} from "../../types/book";
import {BookComponent} from "../../components/BookComponent/BookComponent";

export function Home():React.ReactElement {
    const {data:progresoData} = useQuery("progreso", async()=> {
        const res = await api.get<BookWithProgress[]>("books?status=READING");
        return res;
    }, {refetchOnWindowFocus:false});

    const {data:tableroData} = useQuery("tablero", async()=> {
        const res = await api.get<BookWithProgress[]>("books/tablero");
        return res;
    }, {refetchOnWindowFocus:false});

    const {data:recentBooks} = useQuery("recentbooks", async()=> {
        const res = await api.get<BookWithProgress[]>("books?sort=createdDate");
        return res;
    }, {refetchOnWindowFocus:false});

    return (
        <div className="bg-[#121212] overflow-x-hidden">
            <div className="min-h-screen text-white px-8 py-4 flex flex-col gap-4">
                {progresoData && progresoData.length > 0 && (
                    <Fragment>
                        <h2>En Progreso</h2>
                        <ul className="px-4 flex gap-8">
                            {progresoData?.map((book)=>(
                                <BookComponent key={book._id} bookData={book}/>
                            ))}
                        </ul>
                    </Fragment>
                )}
                {tableroData && tableroData.length > 0 && (
                    <Fragment>
                        <h2>Tablero</h2>
                        <ul className="px-4 flex gap-8">
                            {tableroData?.map((book)=>(
                                <BookComponent key={book._id} bookData={book}/>
                            ))}
                        </ul>
                    </Fragment>
                )}
                {recentBooks && recentBooks.length > 0 && (
                    <Fragment>
                        <h2>Libros Añadidos Recientemente</h2>
                        <ul className="px-4 flex gap-8">
                            {recentBooks?.map((book)=>(
                                <BookComponent key={book._id} bookData={book}/>
                            ))}
                        </ul>
                    </Fragment>
                )}
            </div>
        </div>
    );
}