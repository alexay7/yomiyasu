import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import Login from "./pages/Login/Login";
import {ProtectedLayout} from "./components/Protection/ProtectedLayout";
import {useAuth} from "./contexts/AuthContext";
import {AppLayout} from "./components/AppLayout/AppLayout";
import {Home} from "./pages/Home/Home";
import {Reader} from "./pages/Reader/Reader";
import {Library} from "./pages/Library/Library";

export function App():React.ReactElement {
    const {loading} = useAuth();

    if (loading) {
        return <p>Cargando</p>;
    }

    return (
        <Routes>
            <Route path="/login" element={<Login/>}/>
            <Route path="/app" element={<ProtectedLayout><AppLayout/></ProtectedLayout>}>
                <Route index element={<Home/>}/>
                <Route path="library" element={<Library/>}/>
                <Route path="*" element={<Navigate to="/app"/>}/>
            </Route>
            <Route path="book/:id" element={<Reader/>}/>
            <Route path="*" element={<Navigate to="/app"/>}/>
        </Routes>
    );
}
