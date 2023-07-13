import React from "react";
import {createRoot} from "react-dom/client";
import "./index.css";
import {App} from "./App";
import {AuthProvider} from "./contexts/AuthContext";
import {BrowserRouter} from "react-router-dom";


const root = createRoot(
    document.getElementById("root") as HTMLElement
);
root.render(
    <React.StrictMode>
        <AuthProvider>
            <BrowserRouter>
                <App/>
            </BrowserRouter>
        </AuthProvider>
    </React.StrictMode>
);
