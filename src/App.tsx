import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import MapView from './pages/MapView';
import NotFound from './pages/NotFound';
import { useWasmFeature } from './hooks/useWasmFeature';

const App = () => {
  // Initialize WASM module if enabled via VITE_USE_WASM_GRAPH=true
  useWasmFeature();

  return (
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/artist/:artistName" element={<MapView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
};

export default App;
