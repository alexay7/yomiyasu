import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import "react-toastify/dist/ReactToastify.css";
import App from './App.tsx'
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { GlobalProvider } from './contexts/GlobalContext.tsx';
import { AppToaster } from './components/AppToaster/AppToaster.tsx';
import { BrowserRouter } from 'react-router';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <GlobalProvider>
                        <AppToaster/>
                        <App/>
                    </GlobalProvider>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
  </React.StrictMode>
)
