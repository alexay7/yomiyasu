import {NavigateFunction} from "react-router";
import {api} from "../api/api";
import {Book, BookWithProgress} from "../types/book";
import {openNovel} from "./ttu";
import {confirmDialog} from "../stores/ConfirmStore";

type MoveBook = {
    book:Book;
    navigate:NavigateFunction;
} & ({
    variant:"manga",
} | {
    variant:"novela",
    connector:React.RefObject<HTMLIFrameElement | null>,
});

export async function nextBook(props:MoveBook):Promise<void> {
    const {book, variant, navigate} = props;
    window.localStorage.removeItem(book._id);
    const foundBook = await api.get<BookWithProgress>(`books/${book._id}/next`);

    if (!foundBook) return;

    if (foundBook.status === "completed") {
        if (!await confirmDialog("Ya has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
    }

    if (foundBook._id === "end") {
        navigate(`/app/series/${book.serie}?finished=true`);
        return;
    }
    if (variant === "manga" || book.mokured) {
        navigate(`/reader/${foundBook._id}`);
        return;
    }

    // NOVELA
    const {connector} = props;

    await openNovel(connector, foundBook, false, false);
}

export async function prevBook(props:MoveBook):Promise<void> {
    const {book, variant, navigate} = props;

    const foundBook = await api.get<BookWithProgress>(`books/${book._id}/prev`);

    if (!foundBook) return;

    if (foundBook.status === "completed") {
        if (!await confirmDialog("Ya has leído este volumen. ¿Quieres iniciar un nuevo progreso de lectura?")) return;
    }

    if (foundBook._id === "start") {
        navigate(`/app/series/${book.serie}`);
        return;
    }
    if (variant === "manga" || book.mokured) {
        navigate(`/reader/${foundBook._id}`);
        return;
    }

    // NOVELA
    const {connector} = props;

    await openNovel(connector, foundBook, false, false);
}

