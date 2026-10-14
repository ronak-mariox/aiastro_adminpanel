import { useRef, useState } from 'react'
import { ImageOff, Upload } from 'lucide-react'
import { Button, Input, Modal, Select, Toggle, useToast } from '@/components/ui'
import { uploadImage } from '@/lib/remoteCollection'
import { newId } from '@/lib/utils'
import { PLACEMENTS, bannersDb } from './data'
import { nowIso, todayStr } from './utils'
import type { Banner, BannerPlacement } from './types'

type Draft = Omit<Banner, 'id' | 'createdAt' | 'impressions' | 'clicks' | 'priority'>

export function BannerPreview({ url, title, cta, className = 'aspect-[12/5]' }: { url: string; title: string; cta?: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const broken = !url || failed === url
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gray-100 ${className}`}>
      {broken ? (
        <div className="flex h-full min-h-24 flex-col items-center justify-center gap-1 bg-brand-gradient p-4 text-center text-white">
          {!url ? null : <ImageOff className="size-5 opacity-80" />}
          <p className="text-sm font-semibold">{title || 'Banner title'}</p>
        </div>
      ) : (
        <>
          <img src={url} alt={title} className="h-full w-full object-cover" onError={() => setFailed(url)} />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
            <p className="line-clamp-1 text-sm font-semibold">{title}</p>
          </div>
        </>
      )}
      {cta && <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600">{cta}</span>}
    </div>
  )
}

export function BannerForm({ banner, onClose }: { banner?: Banner; onClose: () => void }) {
  const toast = useToast()
  const [draft, setDraft] = useState<Draft>(() =>
    banner ?? {
      title: '',
      placement: 'userapp_home_hero',
      imageUrl: '',
      ctaText: 'Explore',
      deepLink: 'vedrashi://',
      startDate: todayStr(),
      endDate: `${new Date().getFullYear()}-12-31`,
      active: true,
    },
  )
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const upload = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      set('imageUrl', await uploadImage(file, 'banners'))
    } catch {
      /* reported by uploadImage */
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }))
  const isTicker = draft.placement === 'store_ticker'

  const save = async () => {
    const e: typeof errors = {}
    if (!draft.title.trim()) e.title = 'Title is required'
    if (!isTicker && !/^https?:\/\/.+/.test(draft.imageUrl)) e.imageUrl = 'Enter a valid image URL (https://…)'
    if (!draft.deepLink.trim()) e.deepLink = 'Deep link is required'
    if (draft.endDate < draft.startDate) e.endDate = 'End date is before start date'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      if (banner) {
        const moved = banner.placement !== draft.placement
        const priority = moved ? bannersDb.snapshot().filter(b => b.placement === draft.placement).length + 1 : banner.priority
        await bannersDb.update(banner.id, { ...draft, priority })
        toast('Banner updated')
      } else {
        const priority = bannersDb.snapshot().filter(b => b.placement === draft.placement).length + 1
        await bannersDb.create({ ...draft, id: newId('BNR'), priority, impressions: 0, clicks: 0, createdAt: nowIso() })
        toast('Banner created')
      }
      onClose()
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  const placement = PLACEMENTS.find(p => p.value === draft.placement)

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={banner ? 'Edit banner' : 'New banner'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            {banner ? 'Save changes' : 'Create banner'}
          </Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Title" value={draft.title} onChange={e => set('title', e.target.value)} error={errors.title} />
        </div>
        <Select label="Placement" hint={placement?.size} value={draft.placement} options={PLACEMENTS} onChange={e => set('placement', e.target.value as BannerPlacement)} />
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label="Image URL"
              hint={isTicker ? 'Not used for ticker' : undefined}
              disabled={isTicker}
              value={draft.imageUrl}
              placeholder="https://…"
              onChange={e => set('imageUrl', e.target.value)}
              error={errors.imageUrl}
            />
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" hidden onChange={e => upload(e.target.files?.[0])} />
          <Button variant="outline" icon={<Upload className="size-4" />} loading={uploading} disabled={isTicker} onClick={() => fileRef.current?.click()}>
            Upload
          </Button>
        </div>
        {!isTicker && (
          <div className="sm:col-span-2">
            <BannerPreview url={draft.imageUrl} title={draft.title} cta={draft.ctaText} className={draft.placement === 'festival_modal' ? 'mx-auto aspect-[4/5] max-w-56' : 'aspect-[12/5]'} />
          </div>
        )}
        <Input label="CTA text" value={draft.ctaText} onChange={e => set('ctaText', e.target.value)} />
        <Input label="Deep link" value={draft.deepLink} placeholder="vedrashi://store" onChange={e => set('deepLink', e.target.value)} error={errors.deepLink} />
        <Input label="Start date" type="date" value={draft.startDate} onChange={e => set('startDate', e.target.value)} />
        <Input label="End date" type="date" value={draft.endDate} onChange={e => set('endDate', e.target.value)} error={errors.endDate} />
        <Toggle checked={draft.active} onChange={v => set('active', v)} label="Active" />
      </div>
    </Modal>
  )
}
