import React from "react";
import {createRoot} from "react-dom/client";
import "./index.css";
import {App} from "./App";
import {AuthProvider} from "./contexts/AuthContext";
import {BrowserRouter} from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import {ToastContainer} from "react-toastify";
import {QueryClient, QueryClientProvider} from "react-query";
import {SettingsProvider} from "./contexts/SettingsContext";
import {GlobalProvider} from "./contexts/GlobalContext";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/es";

const root = createRoot(
    document.getElementById("root") as HTMLElement
);

const queryClient = new QueryClient();

root.render(
    <React.StrictMode>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <QueryClientProvider client={queryClient}>
                <GlobalProvider>
                    <AuthProvider>
                        <SettingsProvider>
                            <BrowserRouter>
                                <ToastContainer/>
                                <App/>
                            </BrowserRouter>
                        </SettingsProvider>
                    </AuthProvider>
                </GlobalProvider>
            </QueryClientProvider>
        </LocalizationProvider>
    </React.StrictMode>
);
