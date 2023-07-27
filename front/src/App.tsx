import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import Login from "./pages/Login/Login";
import {ProtectedLayout} from "./components/Protection/ProtectedLayout";
import {useAuth} from "./contexts/AuthContext";
import {AppLayout} from "./components/AppLayout/AppLayout";
import {Home} from "./pages/Home/Home";
import {Reader} from "./pages/Reader/Reader";
import {Library} from "./pages/Library/Library";
import {Serie} from "./pages/Serie/Serie";
import {Loading} from "./pages/Loading/Loading";
import {History} from "./pages/History/History";

export function App():React.ReactElement {
    const {loading} = useAuth();

    if (loading) {
        return <Loading/>;
    }

    return (
        <Routes>
            <Route path="/login" element={<Login/>}/>
            <Route path="/app" element={<ProtectedLayout><AppLayout/></ProtectedLayout>}>
                <Route index element={<Home/>}/>
                <Route path="library" element={<Library/>}/>
                <Route path="series/:id" element={<Serie/>}/>
                <Route path="history" element={<History/>}/>
                <Route path="*" element={<Navigate to="/app"/>}/>
            </Route>
            <Route path="reader/:id" element={<Reader/>}/>
            <Route path="*" element={<Navigate to="/app"/>}/>
        </Routes>
    );
}
