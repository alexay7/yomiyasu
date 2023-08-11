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

export function getFlameColor(difficulty:number):string {
    const colors = [
        "#0074D9", // Azul
        "#3498DB",
        "#5DADE2",
        "#2ED16F",
        "#6AAA0B", // Verde
        "#E67E22", // Naranja
        "#F39C12",
        "#F9690E",
        "#E74C3C", // Rojo
        "#C0392B",
        "#8E44AD"
    ];

    return colors[Math.round(difficulty)];
}