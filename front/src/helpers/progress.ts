import {api} from "../api/api";
import {Book, BookProgress} from "../types/book";

export async function createProgress(bookData:Book, page:number, time:number):Promise<void> {
    let currentPage = page;
    if (currentPage > bookData.pages) {
        currentPage = bookData.pages;
    }

    const newProgress:BookProgress = {
        book:bookData._id,
        time,
        currentPage:currentPage,
        status:"unread"
    };

    if (bookData.pages <= currentPage) {
        // Libro terminado
        newProgress.status = "completed";
        newProgress.endDate = new Date();
    } else if (currentPage > 0) {
        // progreso normal
        newProgress.status = "reading";
    }

    await api.post<BookProgress, Book>("readprogress", newProgress);
}