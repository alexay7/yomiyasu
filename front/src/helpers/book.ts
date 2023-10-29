import {api} from "../api/api";
import {Book, BookWithProgress} from "../types/book";
import {SerieWithProgress} from "../types/serie";

export async function nextBook(book:Book):Promise<void> {
    window.localStorage.removeItem(book._id);
    const foundBook = await api.get<BookWithProgress>(`books/${book._id}/next`);

    if (foundBook.status === "completed") {
        if (!confirm("Yas has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
    }

    if (foundBook._id === "end") {
        window.location.href = `/app/series/${book.serie}?finished=true`;
        return;
    }
    window.location.href = `/reader/${foundBook._id}`;
    return;
}

export async function prevBook(book:Book):Promise<void> {
    const foundBook = await api.get<BookWithProgress>(`books/${book._id}/prev`);

    if (foundBook.status === "completed") {
        if (!confirm("Yas has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
    }

    if (foundBook._id === "start") {
        window.location.href = `/app/series/${book.serie}`;
        return;
    }
    window.location.href = `/reader/${foundBook._id}`;
    return;
}

export function iBook(serieData:SerieWithProgress):void {
    if (serieData.unreadBooks === 0) {
        if (!confirm("Yas has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
    }
    window.localStorage.setItem("origin", window.location.pathname);
    window.location.href = `/reader/${serieData.currentBook}`;
}