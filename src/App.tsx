import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/toaster'
import MainView from '@/pages/MainView'

function App() {
  return (
    <ThemeProvider>
      <Toaster />
      <MainView />
    </ThemeProvider>
  )
}

export default App
