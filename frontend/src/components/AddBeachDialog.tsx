import { useState, type SubmitEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError, geocodeBeach } from '@/lib/api'
import type { Beach } from '@/types/beach'

interface AddBeachDialogProps {
  onAdd: (beach: Omit<Beach, 'id'>) => void
}

export function AddBeachDialog({ onAdd }: AddBeachDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('CA')
  const [status, setStatus] = useState<'idle' | 'loading' | 'not-found' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function reset() {
    setName('')
    setCity('')
    setState('CA')
    setStatus('idle')
    setErrorMessage('')
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    try {
      const { result } = await geocodeBeach(name, city, state)
      onAdd({ name, city, state, lat: result.lat, lon: result.lon })
      setOpen(false)
      reset()
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus('not-found')
      } else {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={<Button variant="outline">Add beach</Button>} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add a beach</DialogTitle>
            <DialogDescription>
              We'll look this up and add it to your list with today's conditions.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="beach-name">Beach name</Label>
              <Input
                id="beach-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ocean Beach"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="beach-city">City</Label>
                <Input
                  id="beach-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="San Francisco"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="beach-state">State</Label>
                <Input
                  id="beach-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CA"
                  required
                />
              </div>
            </div>

            {status === 'not-found' && (
              <p className="text-sm text-destructive">
                No location found for "{name}, {city}, {state}." Try a nearby town name.
              </p>
            )}
            {status === 'error' && (
              <p className="text-sm text-destructive">
                Couldn't reach the location service: {errorMessage}. Try again in a moment.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Looking up…' : 'Add beach'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
