import React from "react";
import {createRoot} from "react-dom/client";
import "./index.css";
import {App} from "./App";
import {AuthProvider} from "./contexts/AuthContext";
import {BrowserRouter} from "react-router-dom";
import {ThemeProvider, createTheme} from "@mui/material/styles";
import "react-toastify/dist/ReactToastify.css";
import {ToastContainer} from "react-toastify";
import {QueryClient, QueryClientProvider} from "react-query";
import {SettingsProvider} from "./contexts/SettingsContext";
import {GlobalProvider} from "./contexts/GlobalContext";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";

const root = createRoot(
    document.getElementById("root") as HTMLElement
);

const darkTheme = createTheme({
    palette: {
        mode: "dark",
        primary:{
            main:"#24B14D"
        }
    }
});

const queryClient = new QueryClient();

root.render(
    <React.StrictMode>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <QueryClientProvider client={queryClient}>
                <GlobalProvider>
                    <ThemeProvider theme={darkTheme}>
                        <AuthProvider>
                            <SettingsProvider>
                                <BrowserRouter>
                                    <ToastContainer/>
                                    <App/>
                                </BrowserRouter>
                            </SettingsProvider>
                        </AuthProvider>
                    </ThemeProvider>
                </GlobalProvider>
            </QueryClientProvider>
        </LocalizationProvider>
    </React.StrictMode>
);
