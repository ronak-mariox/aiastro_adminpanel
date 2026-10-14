import { useRef, useState, type ReactNode } from 'react'
import { ArrowUp, Plus, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, CardBody, CardHeader, IconButton, Input, Label, Select, Textarea } from '@/components/ui'
import { uploadImage } from '@/lib/remoteCollection'
import { formatINR } from '@/lib/utils'
import { BADGES, MOOLANKS, PLANETS, WEEKDAYS, ZODIACS, discountPct, slugify } from '../data'
import { ChipSelect, ProductThumb } from '../shared'
import type { Product, ProductOptions } from '../types'

export type SectionProps = {
  draft: Product
  set: (patch: Partial<Product>) => void
  errors: Partial<Record<keyof Product | 'variants', string>>
}

/** yyyy-mm-ddThh:mm (local) for <input type="datetime-local">, from an ISO string. */
const toLocalInput = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function Section({ id, title, subtitle, action, children }: { id: string; title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <CardBody className="space-y-4">{children}</CardBody>
    </Card>
  )
}

export function BasicsSection({ draft, set, errors, categories, purposes, slugTouched, onSlugTouched }: SectionProps & { categories: string[]; purposes: string[]; slugTouched: boolean; onSlugTouched: () => void }) {
  return (
    <Section id="basics" title="Basics" subtitle="What customers see on the product page">
      <Input
        label="Product name"
        value={draft.name}
        error={errors.name}
        placeholder="e.g. Love & Money Attractor Bracelet"
        onChange={e => set(slugTouched ? { name: e.target.value } : { name: e.target.value, slug: slugify(e.target.value) })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="URL slug"
          hint="/store/…"
          value={draft.slug}
          onChange={e => {
            onSlugTouched()
            set({ slug: slugify(e.target.value) })
          }}
        />
        <Select label="Category" value={draft.category} options={[{ label: 'Select category', value: '' }, ...categories]} onChange={e => set({ category: e.target.value })} />
      </div>
      {errors.category && <p className="-mt-2 text-xs text-red-600">{errors.category}</p>}
      <div>
        <Label hint="Shop by purpose">Purposes</Label>
        <ChipSelect options={purposes} value={draft.purposes} onChange={v => set({ purposes: v })} />
      </div>
      <Input label="Short description" value={draft.shortDescription} maxLength={140} hint={`${draft.shortDescription.length}/140`} onChange={e => set({ shortDescription: e.target.value })} />
      <Textarea label="Description" rows={5} value={draft.description} onChange={e => set({ description: e.target.value })} />
    </Section>
  )
}

export function PricingSection({ draft, set, errors }: SectionProps) {
  const pct = discountPct(draft.price, draft.mrp)
  return (
    <Section id="pricing" title="Pricing" subtitle="Discount is calculated from MRP automatically">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="Selling price (₹)" type="number" min={0} value={draft.price || ''} error={errors.price} onChange={e => set({ price: Number(e.target.value) })} />
        <Input label="MRP (₹)" type="number" min={0} value={draft.mrp || ''} error={errors.mrp} onChange={e => set({ mrp: Number(e.target.value) })} />
        <div>
          <Label>Discount</Label>
          <div className="flex h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm font-semibold text-emerald-700">
            {pct}% off
            {pct > 0 && <span className="text-xs font-normal">· saves {formatINR(draft.mrp - draft.price)}</span>}
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Extra off (%)"
          hint="display only"
          type="number"
          min={0}
          max={90}
          value={draft.extraOffPct || ''}
          onChange={e => set({ extraOffPct: Math.max(0, Math.min(90, Number(e.target.value))) })}
        />
        <div className="sm:col-span-2">
          <Input
            label="Offer ends at"
            hint="countdown on the product page"
            type="datetime-local"
            value={toLocalInput(draft.offerEndsAt)}
            onChange={e => set({ offerEndsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
          />
        </div>
      </div>
      <p className="text-xs text-muted">Shipping is free from ₹999 (₹49 below). GST (18%) is added at checkout. The extra-off badge never changes what is charged.</p>
    </Section>
  )
}

export function InventorySection({ draft, set, errors }: SectionProps) {
  return (
    <Section id="inventory" title="Inventory">
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="SKU" value={draft.sku} error={errors.sku} onChange={e => set({ sku: e.target.value.toUpperCase() })} />
        <Input label="Stock" type="number" min={0} value={draft.stock} onChange={e => set({ stock: Math.max(0, Number(e.target.value)) })} />
        <Input label="Low stock alert at" type="number" min={0} value={draft.lowStockAt} onChange={e => set({ lowStockAt: Math.max(0, Number(e.target.value)) })} />
      </div>
    </Section>
  )
}

const OPTION_GROUPS: { key: keyof ProductOptions; label: string; placeholder: string }[] = [
  { key: 'types', label: 'Type', placeholder: 'e.g. Bracelet, Pendant' },
  { key: 'sizes', label: 'Size', placeholder: 'e.g. 5.25 Ratti, 18mm' },
  { key: 'materials', label: 'Material', placeholder: 'e.g. Silver, Panchdhatu' },
]

/** The buyer's choices (Type / Size / Material). None of them change the price. */
export function OptionsSection({ draft, set }: SectionProps) {
  return (
    <Section id="options" title="Options" subtitle="Choices the buyer picks on the product page — they don't change the price; leave empty for none">
      <div className="grid gap-4 md:grid-cols-3">
        {OPTION_GROUPS.map(g => (
          <div key={g.key}>
            <Label>{g.label}</Label>
            <StringList values={draft.options[g.key]} placeholder={g.placeholder} onChange={v => set({ options: { ...draft.options, [g.key]: v } })} />
          </div>
        ))}
      </div>
    </Section>
  )
}

/** Simple ordered list of strings with add/remove. */
function StringList({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState('')
  const add = () => {
    if (!text.trim()) return
    onChange([...values, text.trim()])
    setText('')
  }
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={v} onChange={e => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          <IconButton aria-label="Remove" className="hover:text-red-600" onClick={() => onChange(values.filter((_, j) => j !== i))}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ))}
      <div className="flex gap-2">
        <Input value={text} placeholder={placeholder} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} />
        <Button variant="outline" icon={<Plus className="size-4" />} onClick={add}>
          Add
        </Button>
      </div>
    </div>
  )
}

export function BenefitsSection({ draft, set }: SectionProps) {
  return (
    <Section id="benefits" title="Benefits" subtitle="Bullet list shown under “Benefits”">
      <StringList values={draft.benefits} onChange={benefits => set({ benefits })} placeholder="e.g. Attracts Prosperity & Wealth" />
    </Section>
  )
}

export function BenefitTagsSection({ draft, set }: SectionProps) {
  return (
    <Section id="tags" title="Benefit tags" subtitle="Short chips shown under the title (e.g. “Lab certified”, “Energised”)">
      <StringList values={draft.benefitTags} onChange={benefitTags => set({ benefitTags })} placeholder="e.g. Lab certified" />
    </Section>
  )
}

export function InfoSectionsSection({ draft, set }: SectionProps) {
  const patch = (i: number, p: Partial<{ title: string; items: string[] }>) => set({ infoSections: draft.infoSections.map((s, j) => (j === i ? { ...s, ...p } : s)) })
  return (
    <Section
      id="info"
      title="Info sections"
      subtitle="Titled lists on the product page (“Care”, “What’s in the box”)"
      action={
        <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => set({ infoSections: [...draft.infoSections, { title: '', items: [] }] })}>
          Add section
        </Button>
      }>
      {draft.infoSections.length === 0 && <p className="text-sm text-muted">No info sections.</p>}
      {draft.infoSections.map((sec, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-line p-3">
          <div className="flex items-center gap-2">
            <Input placeholder="Section title" value={sec.title} onChange={e => patch(i, { title: e.target.value })} />
            <IconButton aria-label="Remove section" className="shrink-0 hover:text-red-600" onClick={() => set({ infoSections: draft.infoSections.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4" />
            </IconButton>
          </div>
          <StringList values={sec.items} onChange={items => patch(i, { items })} placeholder="Add a point" />
        </div>
      ))}
    </Section>
  )
}

export function SpecsSection({ draft, set }: SectionProps) {
  const patch = (i: number, p: Partial<{ key: string; value: string }>) => set({ specs: draft.specs.map((s, j) => (j === i ? { ...s, ...p } : s)) })
  return (
    <Section
      id="specs"
      title="Specifications"
      action={
        <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => set({ specs: [...draft.specs, { key: '', value: '' }] })}>
          Add row
        </Button>
      }>
      {draft.specs.length === 0 && <p className="text-sm text-muted">No specifications.</p>}
      {draft.specs.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input placeholder="Material" value={s.key} onChange={e => patch(i, { key: e.target.value })} />
          <Input placeholder="Multiple Natural Stones" value={s.value} onChange={e => patch(i, { value: e.target.value })} />
          <IconButton aria-label="Remove" className="shrink-0 hover:text-red-600" onClick={() => set({ specs: draft.specs.filter((_, j) => j !== i) })}>
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ))}
    </Section>
  )
}

export function WearSection({ draft, set }: SectionProps) {
  return (
    <Section id="wear" title="How to wear">
      <Textarea label="Instructions" rows={3} value={draft.howToWear} onChange={e => set({ howToWear: e.target.value })} />
      <Select label="Best day to wear" value={draft.bestDay} options={WEEKDAYS} onChange={e => set({ bestDay: e.target.value })} className="sm:w-60" />
    </Section>
  )
}

export function FaqSection({ draft, set }: SectionProps) {
  return (
    <Section
      id="faqs"
      title="FAQs"
      action={
        <Button size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => set({ faqs: [...draft.faqs, { q: '', a: '' }] })}>
          Add FAQ
        </Button>
      }>
      {draft.faqs.length === 0 && <p className="text-sm text-muted">No FAQs.</p>}
      {draft.faqs.map((f, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-line p-3">
          <div className="flex items-center gap-2">
            <Input placeholder="Question" value={f.q} onChange={e => set({ faqs: draft.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
            <IconButton aria-label="Remove FAQ" className="shrink-0 hover:text-red-600" onClick={() => set({ faqs: draft.faqs.filter((_, j) => j !== i) })}>
              <Trash2 className="size-4" />
            </IconButton>
          </div>
          <Textarea placeholder="Answer" rows={2} value={f.a} onChange={e => set({ faqs: draft.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} />
        </div>
      ))}
    </Section>
  )
}

export function AstroSection({ draft, set }: SectionProps) {
  return (
    <Section id="astro" title="Gemstone taxonomy" subtitle="Powers the Stone / Planet / Zodiac / Moolank filters in the app">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Stone name" hint="optional" placeholder="e.g. Neelam (Blue Sapphire)" value={draft.stoneName} onChange={e => set({ stoneName: e.target.value })} />
        <Select label="Ruling planet" value={draft.planet} options={[{ label: 'None', value: '' }, ...PLANETS]} onChange={e => set({ planet: e.target.value })} />
      </div>
      <div>
        <Label>Zodiac (Rashi)</Label>
        <ChipSelect options={ZODIACS} value={draft.zodiac} onChange={zodiac => set({ zodiac })} />
      </div>
      <div>
        <Label>Moolank</Label>
        <ChipSelect options={MOOLANKS} value={draft.moolank} onChange={moolank => set({ moolank: [...moolank].sort() })} />
      </div>
    </Section>
  )
}

export function BadgesSection({ draft, set }: SectionProps) {
  return (
    <Section id="badges" title="Badges">
      <ChipSelect options={BADGES} value={draft.badges} onChange={badges => set({ badges })} />
    </Section>
  )
}

const MAX_IMAGES = 8

export function ImagesSection({ draft, set, errors }: SectionProps) {
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const valid = /^https?:\/\/\S+$/.test(url.trim())
  const full = draft.images.length >= MAX_IMAGES
  const add = () => {
    if (!valid || full) return
    set({ images: [...draft.images, url.trim()] })
    setUrl('')
  }
  const upload = async (files: FileList | null) => {
    const list = [...(files ?? [])].slice(0, MAX_IMAGES - draft.images.length)
    if (!list.length) return
    setUploading(true)
    const urls: string[] = []
    try {
      for (const f of list) urls.push(await uploadImage(f, 'products'))
    } catch {
      /* reported by uploadImage */
    } finally {
      if (urls.length) set({ images: [...draft.images, ...urls] })
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  return (
    <Section
      id="images"
      title="Images & video"
      subtitle={`First image is the cover · up to ${MAX_IMAGES}`}
      action={
        <>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden onChange={e => upload(e.target.files)} />
          <Button size="sm" variant="secondary" icon={<Upload className="size-3.5" />} loading={uploading} disabled={full} onClick={() => fileRef.current?.click()}>
            Upload
          </Button>
        </>
      }>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {draft.images.map((src, i) => (
          <div key={src + i} className="group relative">
            <ProductThumb src={src} name={draft.name || 'Product'} size={120} className="!size-full aspect-square" />
            {i === 0 && (
              <Badge tone="brand" className="absolute top-1.5 left-1.5">
                Cover
              </Badge>
            )}
            <div className="absolute right-1.5 bottom-1.5 flex gap-1">
              {i > 0 && (
                <button type="button" title="Make cover" onClick={() => set({ images: [src, ...draft.images.filter((_, j) => j !== i)] })} className="rounded-lg bg-white/90 p-1 text-ink shadow">
                  <ArrowUp className="size-3.5" />
                </button>
              )}
              <button type="button" title="Remove" onClick={() => set({ images: draft.images.filter((_, j) => j !== i) })} className="rounded-lg bg-white/90 p-1 text-red-600 shadow">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder="https://cdn.vedrashi.com/products/…jpg" value={url} error={url && !valid ? 'Enter a valid http(s) URL' : undefined} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} />
        <Button variant="outline" icon={<Plus className="size-4" />} onClick={add} disabled={!valid || full}>
          Add
        </Button>
      </div>
      {errors.images && <p className="text-xs text-red-600">{errors.images}</p>}
      <Input
        label="Video URL"
        hint="optional · YouTube or MP4"
        placeholder="https://youtube.com/watch?v=…"
        value={draft.videoUrl}
        error={draft.videoUrl && !/^https?:\/\/\S+$/.test(draft.videoUrl.trim()) ? 'Enter a valid http(s) URL' : undefined}
        onChange={e => set({ videoUrl: e.target.value })}
      />
    </Section>
  )
}

export function SeoSection({ draft, set }: SectionProps) {
  return (
    <Section id="seo" title="SEO" subtitle="Search engine listing">
      <Input label="Meta title" hint={`${draft.seoTitle.length}/60`} value={draft.seoTitle} onChange={e => set({ seoTitle: e.target.value })} />
      <Textarea label="Meta description" hint={`${draft.seoDescription.length}/160`} rows={3} value={draft.seoDescription} onChange={e => set({ seoDescription: e.target.value })} />
      <div className="rounded-xl border border-line bg-gray-50/60 p-4">
        <p className="truncate text-xs text-emerald-700">vedrashi.com › store › {draft.slug || 'product'}</p>
        <p className="mt-0.5 truncate text-base text-sky-700">{draft.seoTitle || draft.name || 'Product title'}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{draft.seoDescription || draft.shortDescription || 'Meta description preview'}</p>
      </div>
    </Section>
  )
}
