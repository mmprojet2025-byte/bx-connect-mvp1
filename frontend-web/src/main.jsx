import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'
import './i18n/index.js' // Initialisation i18next
import './monitoring/sentry.js'
import AppErrorBoundary from './monitoring/AppErrorBoundary.jsx'
import { trackAppOpen } from './monitoring/analytics.js'

trackAppOpen()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: '14px',
                  fontWeight: 600,
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </AppErrorBoundary>
    </QueryClientProvider>
  </StrictMode>
)
