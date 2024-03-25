import {api} from "../api/api";
import {Book, BookProgress} from "../types/book";
import {deleteBookBookmark} from "./ttu";

export async function createProgress(bookData:Book, page?:number, time?:number, characters?:number, doublePages?:boolean,
    ttuId?:number):Promise<void> {
    const paramsString = window.location.search;
    const searchParams = new URLSearchParams(paramsString);

    if (searchParams.has("private")) {
        if (bookData.variant === "novela") {
            await deleteBookBookmark(ttuId);
        }
        return;
    }

    if ((bookData.variant === "manga" && (page && page <= 1)) || (bookData.variant === "novela" && characters === 0)) {
        return;
    }

    let currentPage = page;
    if (currentPage) {
        if (currentPage > bookData.pages || (currentPage === bookData.pages - 1 && doublePages)) {
            currentPage = bookData.pages;
        }
    }

    const newProgress:BookProgress = {
        book:bookData._id,
        time,
        currentPage:currentPage,
        status:"unread",
        characters:characters
    };

    if (bookData.variant === "manga" && currentPage) {
        if (bookData.pages <= currentPage) {
        // Libro terminado
            newProgress.status = "completed";
            newProgress.endDate = new Date();
        } else if (currentPage > 0) {

            // progreso normal
            newProgress.status = "reading";
        }
    }

    if (bookData.variant === "novela") {
        if ((characters || 0) >= (bookData.characters || 0) * 0.90) {
            newProgress.status = "completed";
            newProgress.endDate = new Date();
            await deleteBookBookmark(ttuId);
        } else if (characters || 0 > 0) {
            newProgress.status = "reading";
        }
    }

    if (bookData.variant === "manga" && !page) {
        newProgress.status = "reading";
    }

    await api.post<BookProgress, Book>("readprogress", newProgress);
}