import {api} from "../api/api";
import {Book} from "../types/book";
import {SerieWithProgress} from "../types/serie";

export async function nextBook(book:Book):Promise<void> {
    console.log(book);
    const nextBookId = await api.get<{id:string}>(`books/${book._id}/next`);

    if (nextBookId.id === "end") {
        window.location.href = `/app/series/${book.serie}`;
        return;
    }
    window.location.href = `/reader/${nextBookId.id}`;
    return;
}

export async function prevBook(book:Book):Promise<void> {
    const nextBookId = await api.get<{id:string}>(`books/${book._id}/prev`);

    if (nextBookId.id === "start") {
        window.location.href = `/app/series/${book.serie}`;
        return;
    }
    window.location.href = `/reader/${nextBookId.id}`;
    return;
}

export function iBook(serieData:SerieWithProgress):void {
    window.localStorage.setItem("origin", window.location.pathname);
    window.location.href = `/reader/${serieData.currentBook}`;
}