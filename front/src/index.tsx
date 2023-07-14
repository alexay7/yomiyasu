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

const root = createRoot(
    document.getElementById("root") as HTMLElement
);

const darkTheme = createTheme({
    palette: {
        mode: "dark"
    }
});

const queryClient = new QueryClient();

root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={darkTheme}>
                <AuthProvider>
                    <BrowserRouter>
                        <ToastContainer/>
                        <App/>
                    </BrowserRouter>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
