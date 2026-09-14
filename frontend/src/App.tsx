import { useState } from 'react'
import { AddBeachDialog } from '@/components/AddBeachDialog'
import { BeachSelect } from '@/components/BeachSelect'
import { ConditionsPanel } from '@/components/ConditionsPanel'
import { useBeaches } from '@/lib/beaches'

function App() {
  const { beaches, addBeach } = useBeaches()
  const [selectedId, setSelectedId] = useState<string | null>(beaches[0]?.id ?? null)

  const selected = beaches.find((b) => b.id === selectedId) ?? null

  function handleAdd(beach: Parameters<typeof addBeach>[0]) {
    const added = addBeach(beach)
    setSelectedId(added.id)
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CastLine</h1>
          <p className="text-sm text-muted-foreground">Surf fishing conditions, one beach at a time.</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <BeachSelect beaches={beaches} selectedId={selectedId} onSelect={setSelectedId} />
        <AddBeachDialog onAdd={handleAdd} />
      </div>

      {selected ? (
        <ConditionsPanel beach={selected} />
      ) : (
        <p className="text-muted-foreground">Add a beach to see today's conditions.</p>
      )}
    </div>
  )
}

export default App
