import React, {lazy, useEffect, useMemo, useState} from "react";
import {Navigate, Route, Routes} from "react-router-dom";
import {ProtectedLayout} from "./components/Protection/ProtectedLayout";
import {useAuth} from "./contexts/AuthContext";
import {AppLayout} from "./components/AppLayout/AppLayout";
import {Loading} from "./pages/Loading/Loading";
import {Helmet} from "react-helmet";
import {ThemeProvider, createTheme, responsiveFontSizes} from "@mui/material";
import {ColorModeContext} from "./contexts/ColorModeContext";
import Calendar from "./pages/History/pages/Calendar";
import {esES} from "@mui/material/locale";
import {esES as dateEsEs} from "@mui/x-date-pickers";
import {esES as gridEsEs} from "@mui/x-data-grid";
import Words from "./pages/Words/Words";

const Login = lazy(() => import("./pages/Login/Login"));
const Home = lazy(() => import("./pages/Home/Home"));
const Library = lazy(() => import("./pages/Library/Library"));
const Serie = lazy(() => import("./pages/Serie/Serie"));
const History = lazy(() => import("./pages/History/pages/History"));
const Reader = lazy(() => import("./pages/Reader/Reader"));
const EpubReader = lazy(() => import("./pages/EpubReader/EpubReader"));
const Anki = lazy(() => import("./pages/Anki/Anki"));
const Stats = lazy(() => import("./pages/Stats/Stats"));
const Admin = lazy(() => import("./pages/Admin/Admin"));

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
                {
                    palette: {
                        mode: mode,
                        primary:{
                            main:"#308054"
                        }
                    }
                }, esES, dateEsEs, gridEsEs
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
                            content: "#101010"
                        }
                    ]}
                >
                </Helmet>
                {loading ? <Loading/> : (
                    <Routes>
                        <Route path="/login" element={<React.Suspense fallback={<Loading/>}><Login/></React.Suspense>}/>
                        <Route path="/app" element={<ProtectedLayout><AppLayout/></ProtectedLayout>}>
                            <Route index element={<React.Suspense fallback={<Loading/>}><Home/></React.Suspense>}/>
                            <Route path="library">
                                <Route index element={<React.Suspense fallback={<Loading/>}><Library variant="manga"/></React.Suspense>}/>
                                <Route path="manga" element={<React.Suspense fallback={<Loading/>}><Library variant="manga"/></React.Suspense>}/>
                                <Route path="novels" element={<React.Suspense fallback={<Loading/>}><Library variant="novela"/></React.Suspense>}/>
                            </Route>
                            <Route path="series/:id" element={<React.Suspense fallback={<Loading/>}><Serie/></React.Suspense>}/>
                            <Route path="words" element={<React.Suspense fallback={<Loading/>}><Words/></React.Suspense>}/>
                            <Route path="history" element={<React.Suspense fallback={<Loading/>}><History/></React.Suspense>}/>
                            <Route path="profile" element={<React.Suspense fallback={<Loading/>}><Stats/></React.Suspense>}/>
                            <Route path="calendar" element={<React.Suspense fallback={<Loading/>}><Calendar/></React.Suspense>}/>
                            <Route path="admin" element={<React.Suspense fallback={<Loading/>}><Admin/></React.Suspense>}/>
                            <Route path="*" element={<Navigate to="/app"/>}/>
                        </Route>
                        <Route path="reader/:id" element={<React.Suspense fallback={<Loading/>}><Reader/></React.Suspense>}/>
                        <Route path="ranobe/:id" element={<React.Suspense fallback={<Loading/>}><EpubReader/></React.Suspense>}/>
                        <Route path="ankiexport" element={<Anki/>}/>
                        <Route path="*" element={<Navigate to="/app"/>}/>
                    </Routes>
                )}
            </ThemeProvider>
        </ColorModeContext.Provider>
    );
}
