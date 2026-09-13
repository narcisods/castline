import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold">CastLine</h1>
      <p className="text-muted-foreground">Surf fishing conditions, one beach at a time.</p>
      <Button>Select a beach</Button>
    </div>
  )
}

export default App
