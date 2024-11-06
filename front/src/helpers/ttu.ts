import {Book} from "../types/book";

export async function findBookId(title:string):Promise<number | null> {
    // Search for the book in indexedDB with title equal to 涼宮ハルヒの驚愕（後） 「涼宮ハルヒ」シリーズ (角川スニーカー文庫)

    return new Promise<number | null>((resolve, reject) => {
        const request = window.indexedDB.open("books", 6);

        request.onerror = () => {
            reject(new Error("Error opening the database"));
        };

        request.onsuccess = (event: Event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            const transaction = db.transaction(["data"], "readonly");
            const objectStore = transaction.objectStore("data");
            const index = objectStore.index("title");

            const searchRequest = index.get(title);
            searchRequest.onsuccess = () => {
                const book = searchRequest.result as {id:number} | undefined;
                if (book) {
                    resolve(book.id);
                } else {
                    resolve(null);
                }
            };

            searchRequest.onerror = () => {
                reject(new Error("Error searching for the book"));
            };
        };
    });
}

export async function getBookProgress(bookId?:number):Promise<number> {
    if (!bookId) return 0;

    return new Promise<number>((resolve, reject) => {
        const request = window.indexedDB.open("books", 6);

        request.onerror = () => {
            reject(new Error("Error opening the database"));
        };

        request.onsuccess = (event: Event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            const transaction = db.transaction(["bookmark"], "readonly");
            const objectStore = transaction.objectStore("bookmark");

            // FInd object using key path
            const searchRequest = objectStore.get(bookId);

            searchRequest.onsuccess = () => {
                const book = searchRequest.result as {dataId:number, exploredCharCount:number} | undefined;
                if (book) {
                    resolve(book.exploredCharCount);
                } else {
                    resolve(0);
                }
            };

            searchRequest.onerror = () => {
                reject(new Error("Error searching for the book"));
            };
        };
    });
}

export async function deleteBookBookmark(bookId?:number):Promise<void> {
    if (!bookId) return;

    return new Promise<void>((resolve, reject) => {
        const request = window.indexedDB.open("books", 6);

        request.onerror = () => {
            reject(new Error("Error opening the database"));
        };

        request.onsuccess = (event: Event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            const transaction = db.transaction(["bookmark"], "readwrite");
            const objectStore = transaction.objectStore("bookmark");

            // FInd object using key path
            const deleteRequest = objectStore.delete(bookId);

            deleteRequest.onsuccess = () => {
                // Delete also the book in the data object store
                const transaction2 = db.transaction(["data"], "readwrite");
                const objectStore2 = transaction2.objectStore("data");

                // FInd object using key path
                const deleteRequest2 = objectStore2.delete(bookId);

                deleteRequest2.onsuccess = () => {
                    resolve();
                };
            };

            deleteRequest.onerror = () => {
                reject(new Error("Error deleting the bookmark"));
            };
        };
    });
}

export async function openNovel(connector:React.RefObject<HTMLIFrameElement>, bookData:Book, mouse?:boolean, incognito?:boolean):Promise<void> {
    // NOVELA
    if (!connector.current) return;

    const iframe = connector.current;

    // Download epub file from /api/static/ranobe/haruhi.epub and send it to the iframe via message

    const response = await fetch(`/api/static/novelas/${bookData.seriePath}/${bookData.path}.epub`);

    if (!response.ok) {
        console.error("Failed to fetch epub file");
        return;
    }

    // Send as a File
    const blob = await response.blob();

    const file = new File([blob], `${bookData.path}.epub`, {type: blob.type});

    // Send via postmessage
    iframe.contentWindow?.postMessage({book:file, yomiyasuId:bookData._id, mouse, incognito}, "*");
}