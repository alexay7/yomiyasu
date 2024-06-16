import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import "react-toastify/dist/ReactToastify.css";
import "dayjs/locale/es";
import App from './App.tsx'
import { LocalizationProvider } from '@mui/x-date-pickers'
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { GlobalProvider } from './contexts/GlobalContext.tsx';
import { ToastContainer } from 'react-toastify';
import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <BrowserRouter>
                        <GlobalProvider>
                            <ToastContainer/>
                            <App/>
                        </GlobalProvider>
                    </BrowserRouter>
                </AuthProvider>
            </QueryClientProvider>
        </LocalizationProvider>
    </React.StrictMode>
)
