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
    </React.StrictMode>
);
