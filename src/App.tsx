import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LastFmAuthProvider } from '@/contexts/LastFmAuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import MapView from './pages/MapView';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';
import { useWasmFeature } from './hooks/useWasmFeature';

const App = () => {
  // Initialize WASM module if enabled via VITE_USE_WASM_GRAPH=true
  useWasmFeature();

  return (
    <LastFmAuthProvider>
      <ThemeProvider defaultTheme="system">
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/artist/:artistName" element={<MapView />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </LastFmAuthProvider>
  );
};

export default App;
