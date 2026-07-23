import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles/index.css';

const App      = lazy(() => import('./App'));
const AdminApp = lazy(() => import('./AdminApp'));

/**
 * Route based on URL path:
 * /admin  → AdminApp (separate login + dashboard)
 * /*      → User App
 */
const isAdminRoute = window.location.pathname.startsWith('/admin');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background: isAdminRoute ? '#0f0c29' : '#f8fafc' }}>
          <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      }>
        {isAdminRoute ? <AdminApp /> : <App />}
      </Suspense>
    </QueryClientProvider>
  </StrictMode>
);