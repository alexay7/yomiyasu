import {toast} from "react-toastify";
import {api} from "../api/api";

export async function addToReadlist(serieId:string, serieName?:string):Promise<void> {
    const body = {
        serie:serieId
    };

    try {
        await api.post<{serie:string}, {serie:string}>("readlists", body);
        toast.success(`${serieName ? serieName : "Serie"  } añadida a tu lista de 'Leer más tarde'`);
    } catch {
        toast.error("Esta serie ya está en tu lista de 'Leer más tarde'");
    }
}

export async function removeFromReadlist(serieId:string, serieName?:string):Promise<void> {
    const body = {
        serie:serieId
    };

    try {
        await api.post<{serie:string}, {serie:string}>("readlists/delete", body);
        toast.success(`${serieName ? serieName : "Serie" } eliminada de tu lista de 'Leer más tarde'`);
    } catch {
        toast.error("Esta serie no está en tu lista de 'Leer más tarde'");
    }
}