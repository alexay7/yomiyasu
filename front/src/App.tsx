import React, {lazy, useEffect, useMemo, useState} from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {ProtectedLayout} from "./components/Protection/ProtectedLayout";
import {useAuth} from "./contexts/AuthContext";
import {AppLayout} from "./components/AppLayout/AppLayout";
import {Loading} from "./pages/Loading/Loading";
import {Helmet} from "react-helmet";
import {ThemeProvider, createTheme, responsiveFontSizes} from "@mui/material";
import {ColorModeContext} from "./contexts/ColorModeContext";
import Stats from "./pages/Stats/Stats";

const Login = lazy(() => import("./pages/Login/Login"));
const Home = lazy(() => import("./pages/Home/Home"));
const Library = lazy(() => import("./pages/Library/Library"));
const Serie = lazy(() => import("./pages/Serie/Serie"));
const History = lazy(() => import("./pages/History/History"));
const Reader = lazy(() => import("./pages/Reader/Reader"));
const Anki = lazy(() => import("./pages/Anki/Anki"));

export function App():React.ReactElement {
    const [mode, setMode] = useState<"dark" | "light">("dark");

    useEffect(() => {
        setMode(window.localStorage.getItem("color-theme") as "dark" | "light" || "dark");
    }, []);

    const colorMode = useMemo(
        () => ({
            toggleColorMode: () => {
                setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
            }
        }),
        []
    );

    let theme = useMemo(
        () =>
            createTheme(
                {palette: {
                    mode: mode,
                    primary:{
                        main:"#24B14D"
                    }
                }}
            ),
        [mode]
    );

    theme = responsiveFontSizes(theme);

    const {loading} = useAuth();

    return (
        <ColorModeContext.Provider value={colorMode}>
            <ThemeProvider theme={theme}>
                <Helmet
                    meta={[
                        {
                            name: "theme-color",
                            content: "#272727"
                        }
                    ]}
                >
                </Helmet>
                {loading ? <Loading/> : (
                    <Routes>
                        <Route path="/login" element={<React.Suspense fallback={<Loading/>}><Login/></React.Suspense>}/>
                        <Route path="/app" element={<ProtectedLayout><AppLayout/></ProtectedLayout>}>
                            <Route index element={<React.Suspense fallback={<Loading/>}><Home/></React.Suspense>}/>
                            <Route path="library" element={<React.Suspense fallback={<Loading/>}><Library/></React.Suspense>}/>
                            <Route path="series/:id" element={<React.Suspense fallback={<Loading/>}><Serie/></React.Suspense>}/>
                            <Route path="history" element={<React.Suspense fallback={<Loading/>}><History/></React.Suspense>}/>
                            <Route path="profile" element={<React.Suspense fallback={<Loading/>}><Stats/></React.Suspense>}/>
                            <Route path="*" element={<Navigate to="/app"/>}/>
                        </Route>
                        <Route path="reader/:id" element={<React.Suspense fallback={<Loading/>}><Reader/></React.Suspense>}/>
                        <Route path="ankiexport" element={<Anki/>}/>
                        <Route path="*" element={<Navigate to="/app"/>}/>
                    </Routes>
                )}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}
