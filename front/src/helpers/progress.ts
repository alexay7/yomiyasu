import {api} from "../api/api";
import {Book, BookProgress} from "../types/book";

export async function createProgress(bookData:Book, page:number, time:number):Promise<void> {
    const newProgress:BookProgress = {
        book:bookData._id,
        time,
        currentPage:page,
        status:"unread"
    };

    if (bookData.pages === page) {
        // Libro terminado
        newProgress.status = "completed";
        newProgress.endDate = new Date();
    } else if (page > 0) {
        // progreso normal
        newProgress.status = "reading";
    }

    await api.post<BookProgress, Book>("readprogress", newProgress);
}