import React from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import Login from "./pages/Login/Login";
import {ProtectedLayout} from "./components/Protection/ProtectedLayout";

export function App():React.ReactElement {
    return (
        <Routes>
            <Route path="/" element={<></>}/>
            <Route path="/login" element={<Login/>}/>
            <Route path="/protected" element={<ProtectedLayout/>}>
                <Route path="a" element={<img src="http://localhost/api/static/yotsubato/Yotsuba-to--14/001.jpg" alt="" />}/>
            </Route>
            <Route path="*" element={<Navigate to="login"/>}/>
        </Routes>
    );
}
