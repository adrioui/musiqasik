import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LastFmAuthProvider } from '@/contexts/LastFmAuthContext'
import AuthCallback from './pages/AuthCallback'
import Index from './pages/Index'
import MapView from './pages/MapView'
import NotFound from './pages/NotFound'

const App = () => {
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
  )
}

export default App
