import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useCollection } from '@/lib/store'
import { catalogDb, logAudit } from './data'
import type { CatalogList } from './types'

export default function CatalogTab() {
  const { items } = useCollection(catalogDb)
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {items.map(list => (
        <ChipList key={list.id} list={list} />
      ))}
    </div>
  )
}

function ChipList({ list }: { list: CatalogList }) {
  const toast = useToast()
  const { admin } = useAuth()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const add = async () => {
    const v = value.trim()
    if (!v) return
    if (list.items.some(i => i.toLowerCase() === v.toLowerCase())) {
      setError(`"${v}" already exists`)
      return
    }
    await catalogDb.update(list.id, { items: [...list.items, v] })
    logAudit(admin, 'Settings', `Added to ${list.label}`, v)
    setValue('')
    setError('')
    toast(`Added "${v}"`)
  }

  const remove = async (item: string) => {
    await catalogDb.update(list.id, { items: list.items.filter(i => i !== item) })
    logAudit(admin, 'Settings', `Removed from ${list.label}`, item)
    toast(`Removed "${item}"`, 'info')
  }

  return (
    <Card>
      <CardHeader title={list.label} subtitle={list.description} action={<span className="text-xs text-muted">{list.items.length}</span>} />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {list.items.map(item => (
            <span key={item} className="inline-flex items-center gap-1 rounded-full border border-line bg-gray-50 py-1 pr-1 pl-3 text-sm">
              {item}
              <button type="button" aria-label={`Remove ${item}`} onClick={() => remove(item)} className="rounded-full p-0.5 text-muted hover:bg-red-50 hover:text-red-600">
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          {list.items.length === 0 && <p className="text-sm text-muted">No items yet.</p>}
        </div>
        <form
          className="flex items-start gap-2"
          onSubmit={e => {
            e.preventDefault()
            add()
          }}>
          <div className="flex-1">
            <Input
              placeholder={`Add to ${list.label.toLowerCase()}…`}
              value={value}
              error={error}
              onChange={e => {
                setValue(e.target.value)
                setError('')
              }}
            />
          </div>
          <Button type="submit" variant="secondary" icon={<Plus className="size-4" />} disabled={!value.trim()}>
            Add
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
