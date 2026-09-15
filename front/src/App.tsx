import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router';
import { Loading } from './pages/Loading/Loading';
import { useAuth } from './contexts/AuthContext';
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog';
import { RouteFallback } from './components/AppLayout/RouteFallback';

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
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));


function App() {
  const {loading} = useAuth();

  return (
        <>
        {loading ? <Loading/> : (
            <Routes>
                <Route path="/" element={<Navigate to="/app"/>}/>
                <Route path="/login" element={<Suspense fallback={<Loading/>}><Login/></Suspense>}/>
                <Route path="/coderedeem" element={<Suspense fallback={<Loading/>}><Register/></Suspense>}/>
                <Route path="/app" element={<ProtectedLayout><AppLayout/></ProtectedLayout>}>
                    <Route index element={<Suspense fallback={<RouteFallback/>}><Home/></Suspense>}/>
                    <Route path="library">
                        <Route index element={<Navigate to="manga" replace/>}/>
                        <Route path="manga" element={<Suspense fallback={<RouteFallback/>}><Library variant="manga"/></Suspense>}/>
                        <Route path="novels" element={<Suspense fallback={<RouteFallback/>}><Library variant="novela"/></Suspense>}/>
                    </Route>
                    <Route path="series/:id" element={<Suspense fallback={<RouteFallback/>}><Serie/></Suspense>}/>
                    <Route path="words" element={<Suspense fallback={<RouteFallback/>}><Words/></Suspense>}/>
                    <Route path="history" element={<Suspense fallback={<RouteFallback/>}><History/></Suspense>}/>
                    <Route path="profile" element={<Suspense fallback={<RouteFallback/>}><Stats/></Suspense>}/>
                    <Route path="calendar" element={<Suspense fallback={<RouteFallback/>}><Calendar/></Suspense>}/>
                    <Route path="admin" element={<Suspense fallback={<RouteFallback/>}><Admin/></Suspense>}/>
                    <Route path="*" element={<Suspense fallback={<RouteFallback/>}><NotFound/></Suspense>}/>
                </Route>
                <Route path="reader/:id" element={<Suspense fallback={<Loading/>}><Reader type="remote"/></Suspense>}/>
                <Route path="ranobe/:id" element={<Suspense fallback={<Loading/>}><EpubReader/></Suspense>}/>
                <Route path="ankiexport" element={<Suspense fallback={<Loading/>}><Anki/></Suspense>}/>
                <Route path="offline" element={<Suspense fallback={<Loading/>}><Offline/></Suspense>}/>
                <Route path="*" element={<Suspense fallback={<Loading/>}><NotFound/></Suspense>}/>
            </Routes>
        )}
        <ConfirmDialog/>
        </>
  )
}

export default App
