import { ExternalLinkIcon } from 'lucide-react'
import { buildDirectionsUrl } from '@/lib/directions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Beach } from '@/types/beach'

interface BeachSelectProps {
  beaches: Beach[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function BeachSelect({ beaches, selectedId, onSelect }: BeachSelectProps) {
  const selected = beaches.find((b) => b.id === selectedId) ?? null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedId ?? undefined} onValueChange={(value) => onSelect(value as string)}>
        <SelectTrigger className="w-72">
          <SelectValue placeholder="Select a beach">
            {(id: string | null) => {
              const beach = beaches.find((b) => b.id === id)
              return beach ? `${beach.name} (${beach.city}, ${beach.state})` : 'Select a beach'
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {beaches.map((beach) => (
            <SelectItem key={beach.id} value={beach.id}>
              {beach.name} ({beach.city}, {beach.state})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <a
          href={buildDirectionsUrl(selected.lat, selected.lon)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Get directions
          <ExternalLinkIcon className="size-3.5" />
        </a>
      )}
    </div>
  )
}
