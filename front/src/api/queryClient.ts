import {QueryClient} from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Evita refetches masivos cada vez que la ventana recupera el foco
            refetchOnWindowFocus: false,
            // Durante 2 minutos los datos se reutilizan de la caché al navegar entre páginas
            staleTime: 2 * 60 * 1000,
            retry: 1
        }
    }
});
