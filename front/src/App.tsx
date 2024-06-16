import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { createTheme, responsiveFontSizes, ThemeProvider } from '@mui/material'
import {esES} from "@mui/material/locale";
import { ColorModeContext } from './contexts/ColorModeContext'
import { Helmet } from 'react-helmet'
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loading } from './pages/Loading/Loading';
import { useAuth } from './contexts/AuthContext';

const AppLayout = lazy(() => import('./components/AppLayout/AppLayout'));
const ProtectedLayout = lazy(() => import('./components/Protection/ProtectedLayout'));

const Home = lazy(() => import('./pages/Home/Home'));
const Serie = lazy(() => import('./pages/Serie/Serie'));
const Library = lazy(() => import('./pages/Library/Library'));
const Words = lazy(() => import('./pages/Words/Words'));
const Stats = lazy(() => import('./pages/Stats/Stats'));
const Calendar = lazy(() => import('./pages/History/pages/Calendar'));
const Admin = lazy(() => import('./pages/Admin/Admin'));
const Reader = lazy(() => import('./pages/Reader/Reader'));
const EpubReader = lazy(() => import('./pages/EpubReader/EpubReader'));
const Anki = lazy(() => import('./pages/Anki/Anki'));
const History = lazy(() => import('./pages/History/pages/History'));
const Login = lazy(() => import('./pages/Login/Login'));
const Register = lazy(() => import('./pages/Register/Register'));
const Offline = lazy(() => import('./pages/Offline/Offline'));


function App() {
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
      () =>{
          return createTheme(
              {
                  palette: {
                      mode: mode,
                      primary:{
                          main:"#308054"
                      }
                  }
              }, esES
          )
        },
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
                <Route path="/" element={<Navigate to="/app"/>}/>
                <Route path="/login" element={<Suspense fallback={<Loading/>}><Login/></Suspense>}/>
                <Route path="/coderedeem" element={<Suspense fallback={<Loading/>}><Register/></Suspense>}/>
                <Route path="/app" element={<ProtectedLayout><AppLayout/></ProtectedLayout>}>
                    <Route index element={<Suspense fallback={<Loading/>}><Home/></Suspense>}/>
                    <Route path="library">
                        <Route index element={<Suspense fallback={<Loading/>}><Library variant="manga"/></Suspense>}/>
                        <Route path="manga" element={<Suspense fallback={<Loading/>}><Library variant="manga"/></Suspense>}/>
                        <Route path="novels" element={<Suspense fallback={<Loading/>}><Library variant="novela"/></Suspense>}/>
                    </Route>
                    <Route path="series/:id" element={<Suspense fallback={<Loading/>}><Serie/></Suspense>}/>
                    <Route path="words" element={<Suspense fallback={<Loading/>}><Words/></Suspense>}/>
                    <Route path="history" element={<Suspense fallback={<Loading/>}><History/></Suspense>}/>
                    <Route path="profile" element={<Suspense fallback={<Loading/>}><Stats/></Suspense>}/>
                    <Route path="calendar" element={<Suspense fallback={<Loading/>}><Calendar/></Suspense>}/>
                    <Route path="admin" element={<Suspense fallback={<Loading/>}><Admin/></Suspense>}/>
                    <Route path="*" element={<Navigate to="/app"/>}/>
                </Route>
                <Route path="reader/:id" element={<Suspense fallback={<Loading/>}><Reader type="remote"/></Suspense>}/>
                <Route path="ranobe/:id" element={<Suspense fallback={<Loading/>}><EpubReader/></Suspense>}/>
                <Route path="ankiexport" element={<Suspense fallback={<Loading/>}><Anki/></Suspense>}/>
                <Route path="offline" element={<Suspense fallback={<Loading/>}><Offline/></Suspense>}/>
            </Routes>
        )}
    </ThemeProvider>
</ColorModeContext.Provider>
  )
}

export default App
