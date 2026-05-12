import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Profiler } from './pages/Profiler';
import { ModelAnalysis } from './pages/Model';
import { Optimizer } from './pages/Optimizer';
import { Prompts } from './pages/Prompt';
import { Results } from './pages/Results';

export default function App() {
  return (
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
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}