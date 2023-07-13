import React from "react";
import {createRoot} from "react-dom/client";
import "./index.css";
import {App} from "./App";
import {AuthProvider} from "./contexts/AuthContext";
import {BrowserRouter} from "react-router-dom";
import {ThemeProvider, createTheme} from "@mui/material/styles";
import "react-toastify/dist/ReactToastify.css";
import {ToastContainer} from "react-toastify";

const root = createRoot(
    document.getElementById("root") as HTMLElement
);

const darkTheme = createTheme({
    palette: {
        mode: "dark"
    }
});

root.render(
    <React.StrictMode>
        <ThemeProvider theme={darkTheme}>
            <AuthProvider>
                <BrowserRouter>
                    <ToastContainer/>
                    <App/>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    </React.StrictMode>
);
