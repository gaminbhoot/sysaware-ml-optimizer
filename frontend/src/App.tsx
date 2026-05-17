import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationContainer } from './components/Notification';
import { Layout } from './components/Layout';

// Lazy load pages
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Profiler = lazy(() => import('./pages/Profiler').then(m => ({ default: m.Profiler })));
const ModelAnalysis = lazy(() => import('./pages/Model').then(m => ({ default: m.ModelAnalysis })));
const Prompts = lazy(() => import('./pages/Prompt').then(m => ({ default: m.Prompts })));
const FleetView = lazy(() => import('./pages/FleetView').then(m => ({ default: m.FleetView })));

// Loading component
const PageLoader = () => (
  <div className="w-full h-screen flex items-center justify-center bg-[#050505]">
    <div className="w-8 h-8 border-2 border-white/10 border-t-white/80 rounded-full animate-spin" />
  </div>
);

export default function App() {
  return (
    <NotificationProvider>
      <StoreProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/profiler" element={<Profiler />} />
                <Route path="/model" element={<ModelAnalysis />} />
                <Route path="/optimizer" element={<Navigate to="/model" replace />} />
                <Route path="/results" element={<Navigate to="/model" replace />} />
                <Route path="/prompt" element={<Prompts />} />
                <Route path="/fleet" element={<FleetView />} />
              </Route>
            </Routes>
          </Suspense>
          <NotificationContainer />
        </BrowserRouter>
      </StoreProvider>
    </NotificationProvider>
  );
}