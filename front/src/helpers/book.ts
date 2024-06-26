import {api} from "../api/api";
import {Book, BookWithProgress} from "../types/book";
import {SerieWithProgress} from "../types/serie";
import {openNovel} from "./ttu";

type MoveBook = {
    book:Book;
} & ({
    variant:"manga",
} | {
    variant:"novela",
    connector:React.RefObject<HTMLIFrameElement>,
});

export async function nextBook(props:MoveBook):Promise<void> {
    const {book, variant} = props;
    window.localStorage.removeItem(book._id);
    const foundBook = await api.get<BookWithProgress>(`books/${book._id}/next`);

    if (!foundBook) return;

    if (foundBook.status === "completed") {
        if (!confirm("Yas has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
    }

    if (foundBook._id === "end") {
        window.location.href = `/app/series/${book.serie}?finished=true`;
        return;
    }
    if (variant === "manga" || book.mokured) {
        window.location.href = `/reader/${foundBook._id}`;
        return;
    }

    // NOVELA
    const {connector} = props;

    await openNovel(connector, foundBook, false, false);
}

export async function prevBook(props:MoveBook):Promise<void> {
    const {book, variant} = props;

    const foundBook = await api.get<BookWithProgress>(`books/${book._id}/prev`);

    if (!foundBook) return;

    if (foundBook.status === "completed") {
        if (!confirm("Yas has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
    }

    if (foundBook._id === "start") {
        window.location.href = `/app/series/${book.serie}`;
        return;
    }
    if (variant === "manga" || book.mokured) {
        window.location.href = `/reader/${foundBook._id}`;
        return;
    }

    // NOVELA
    const {connector} = props;

    await openNovel(connector, foundBook, false, false);
}

export function iBook(serieData:SerieWithProgress):void {
    if (serieData.unreadBooks === 0) {
        if (!confirm("Yas has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
    }
    window.localStorage.setItem("origin", window.location.pathname);
    window.location.href = `/reader/${serieData.currentBook}`;
}