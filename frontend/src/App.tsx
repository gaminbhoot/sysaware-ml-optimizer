import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationContainer } from './components/Notification';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Profiler } from './pages/Profiler';
import { ModelAnalysis } from './pages/Model';
import { Optimizer } from './pages/Optimizer';
import { Prompts } from './pages/Prompt';
import { Results } from './pages/Results';
import { FleetView } from './pages/FleetView';

export default function App() {
  return (
    <NotificationProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/profiler" element={<Profiler />} />
              <Route path="/model" element={<ModelAnalysis />} />
              <Route path="/optimizer" element={<Optimizer />} />
              <Route path="/prompt" element={<Prompts />} />
              <Route path="/results" element={<Results />} />
              <Route path="/fleet" element={<FleetView />} />
            </Route>
          </Routes>
          <NotificationContainer />
        </BrowserRouter>
      </StoreProvider>
    </NotificationProvider>
  );
}