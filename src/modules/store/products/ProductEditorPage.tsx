import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Copy, Save, Star, Trash2 } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, DetailList, EmptyState, PageHeader, Toggle, useConfirm, useToast } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatDateTime, formatINR, formatNumber, newId } from '@/lib/utils'
import { categoriesDb, discountPct, productStatus, productsDb, purposesDb, totalStock } from '../data'
import { ProductStatusBadge, ProductThumb } from '../shared'
import type { Product } from '../types'
import {
  AstroSection,
  BadgesSection,
  BasicsSection,
  BenefitsSection,
  BenefitTagsSection,
  FaqSection,
  ImagesSection,
  InfoSectionsSection,
  InventorySection,
  OptionsSection,
  PricingSection,
  SeoSection,
  SpecsSection,
  WearSection,
  type SectionProps,
} from './EditorSections'

const NAV = [
  ['basics', 'Basics'],
  ['pricing', 'Pricing'],
  ['inventory', 'Inventory'],
  ['options', 'Options'],
  ['benefits', 'Benefits'],
  ['tags', 'Benefit tags'],
  ['info', 'Info sections'],
  ['specs', 'Specifications'],
  ['wear', 'How to wear'],
  ['faqs', 'FAQs'],
  ['astro', 'Gemstone taxonomy'],
  ['badges', 'Badges'],
  ['images', 'Images & video'],
  ['seo', 'SEO'],
] as const

const blank = (): Product => {
  const now = new Date().toISOString()
  return {
    id: newId('PRD'),
    name: '',
    slug: '',
    category: '',
    purposes: [],
    shortDescription: '',
    description: '',
    price: 0,
    mrp: 0,
    sku: `AV-${Date.now().toString().slice(-6)}`,
    stock: 0,
    lowStockAt: 10,
    variants: [],
    options: { types: [], sizes: [], materials: [] },
    benefits: [],
    specs: [],
    howToWear: '',
    bestDay: 'Monday',
    faqs: [],
    planet: '',
    zodiac: [],
    moolank: [],
    stoneName: '',
    badges: ['New'],
    benefitTags: [],
    infoSections: [],
    images: [],
    videoUrl: '',
    extraOffPct: 0,
    offerEndsAt: '',
    featured: false,
    seoTitle: '',
    seoDescription: '',
    published: false,
    rating: 0,
    reviews: 0,
    sold: 0,
    createdAt: now,
    updatedAt: now,
  }
}

function validate(p: Product, all: Product[]): SectionProps['errors'] {
  const e: SectionProps['errors'] = {}
  if (!p.name.trim()) e.name = 'Name is required'
  if (!p.category) e.category = 'Pick a category'
  if (!(p.price > 0)) e.price = 'Price must be greater than 0'
  if (p.mrp < p.price) e.mrp = 'MRP cannot be lower than price'
  if (p.sku.trim() && all.some(x => x.id !== p.id && x.sku === p.sku)) e.sku = 'SKU already in use'
  if (p.videoUrl.trim() && !/^https?:\/\/\S+$/.test(p.videoUrl.trim())) e.videoUrl = 'Enter a valid video URL'
  if (p.images.length > 8) e.images = 'Up to 8 images'
  if (p.published && p.images.length === 0) e.images = 'Add at least one image before publishing'
  return e
}

export default function ProductEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const { items, loading, update, create, remove } = useCollection(productsDb)
  const { items: categories } = useCollection(categoriesDb)
  const { items: purposes } = useCollection(purposesDb)
  const existing = isNew ? undefined : items.find(p => p.id === id)

  const [draft, setDraft] = useState<Product | null>(() => (isNew ? blank() : existing ? structuredClone(existing) : null))
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load the record into the form once it's available (or when navigating between products).
  useEffect(() => {
    if (isNew) setDraft(d => (d && !items.some(p => p.id === d.id) ? d : blank()))
    else if (existing) setDraft(d => (d?.id === existing.id ? d : structuredClone(existing)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, existing?.id])

  const errors = useMemo(() => (draft && showErrors ? validate(draft, items) : {}), [draft, showErrors, items])
  const dirty = useMemo(() => (isNew ? !!draft?.name : JSON.stringify(draft) !== JSON.stringify(existing)), [draft, existing, isNew])

  if (!isNew && !existing) {
    return (
      <>
        <PageHeader title="Product" breadcrumbs={[{ label: 'Products', to: '/products' }, { label: id ?? '' }]} />
        <Card>{loading ? <div className="h-40 animate-pulse" /> : <EmptyState title="Product not found" text={`No product with id ${id}.`} action={<Button onClick={() => navigate('/products')}>Back to products</Button>} />}</Card>
      </>
    )
  }
  if (!draft) return null

  const set = (patch: Partial<Product>) => setDraft(d => (d ? { ...d, ...patch } : d))
  const sectionProps: SectionProps = { draft, set, errors }

  const save = async () => {
    const errs = validate(draft, items)
    if (Object.keys(errs).length) {
      setShowErrors(true)
      toast(Object.values(errs)[0] ?? 'Fix the highlighted fields', 'error')
      return
    }
    setSaving(true)
    const record: Product = {
      ...draft,
      name: draft.name.trim(),
      seoTitle: draft.seoTitle || `Buy ${draft.name.trim()} Online | AstroVati by VedRashi`,
      updatedAt: new Date().toISOString(),
    }
    try {
      if (isNew) {
        const saved = await create(record)
        toast(`${saved.name} created`)
        navigate(`/products/${saved.id}`, { replace: true })
      } else {
        const saved = await update(record.id, record)
        setDraft(structuredClone(saved))
        toast('Product saved')
      }
      setShowErrors(false)
    } catch {
      /* the error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    const ok = await confirm({ title: `Delete ${draft.name}?`, message: 'The product is archived: it leaves the store and this list. Existing orders keep their copy.', confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await remove(draft.id)
    toast('Product archived — removed from the store')
    navigate('/products')
  }

  const duplicate = async () => {
    const copy: Product = { ...structuredClone(draft), id: newId('PRD'), name: `${draft.name} (Copy)`, slug: `${draft.slug}-copy`, sku: draft.sku ? `${draft.sku}-C` : '', published: false, sold: 0, reviews: 0, rating: 0, createdAt: new Date().toISOString() }
    const saved = await create(copy)
    toast('Duplicated as draft')
    navigate(`/products/${saved.id}`)
  }

  const togglePublish = async (v: boolean) => {
    if (v && draft.images.length === 0) {
      setShowErrors(true)
      toast('Add at least one image before publishing', 'error')
      return
    }
    set({ published: v })
    if (!isNew) {
      await update(draft.id, { published: v })
      toast(v ? 'Published to store' : 'Hidden from the store', 'info')
    }
  }

  return (
    <>
      <PageHeader
        title={isNew ? 'New product' : draft.name || 'Untitled product'}
        subtitle={isNew ? 'Add a product to the AstroVati store' : `${draft.sku} · last updated ${formatDateTime(draft.updatedAt)}`}
        breadcrumbs={[{ label: 'Products', to: '/products' }, { label: isNew ? 'New' : draft.id }]}
        actions={
          <>
            {!isNew && (
              <>
                <Button variant="ghost" icon={<Trash2 className="size-4" />} onClick={del}>
                  Delete
                </Button>
                <Button variant="outline" icon={<Copy className="size-4" />} onClick={duplicate}>
                  Duplicate
                </Button>
              </>
            )}
            <Button icon={<Save className="size-4" />} loading={saving} disabled={!dirty} onClick={save}>
              {isNew ? 'Create product' : 'Save changes'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          <BasicsSection {...sectionProps} categories={categories.filter(c => c.active || c.name === draft.category).map(c => c.name)} purposes={purposes.map(p => p.name)} slugTouched={slugTouched} onSlugTouched={() => setSlugTouched(true)} />
          <PricingSection {...sectionProps} />
          <InventorySection {...sectionProps} />
          <OptionsSection {...sectionProps} />
          <BenefitsSection {...sectionProps} />
          <BenefitTagsSection {...sectionProps} />
          <InfoSectionsSection {...sectionProps} />
          <SpecsSection {...sectionProps} />
          <WearSection {...sectionProps} />
          <FaqSection {...sectionProps} />
          <AstroSection {...sectionProps} />
          <BadgesSection {...sectionProps} />
          <ImagesSection {...sectionProps} />
          <SeoSection {...sectionProps} />
        </div>

        <aside className="order-1 space-y-4 lg:sticky lg:top-20 lg:order-2 lg:self-start">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center gap-3">
                <ProductThumb src={draft.images[0]} name={draft.name} size={56} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{draft.name || 'Untitled'}</p>
                  <p className="text-sm">
                    <span className="font-semibold">{formatINR(draft.price)}</span>{' '}
                    {draft.mrp > draft.price && <span className="text-xs text-muted line-through">{formatINR(draft.mrp)}</span>}{' '}
                    {discountPct(draft.price, draft.mrp) > 0 && <span className="text-xs font-medium text-emerald-600">{discountPct(draft.price, draft.mrp)}% off</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-4">
                <Toggle checked={draft.published} onChange={togglePublish} label="Published" />
                <ProductStatusBadge status={productStatus(draft)} />
              </div>
              <Toggle checked={draft.featured} onChange={v => set({ featured: v })} label="Featured in the store" />
              {dirty && <p className="text-xs text-amber-700">You have unsaved changes.</p>}
            </CardBody>
          </Card>

          {!isNew && (
            <Card>
              <CardHeader title="Performance" />
              <CardBody>
                <DetailList
                  items={[
                    { label: 'Units sold', value: formatNumber(draft.sold) },
                    { label: 'Revenue', value: formatINR(draft.sold * draft.price) },
                    {
                      label: 'Rating',
                      value: (
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 fill-gold-400 text-gold-400" /> {draft.rating.toFixed(1)}
                        </span>
                      ),
                    },
                    { label: 'Reviews', value: formatNumber(draft.reviews) },
                    { label: 'In stock', value: formatNumber(totalStock(draft)) },
                    { label: 'Created', value: formatDateTime(draft.createdAt) },
                  ]}
                />
              </CardBody>
            </Card>
          )}

          <Card className="hidden lg:block">
            <nav className="flex flex-col p-2 text-sm">
              {NAV.map(([key, label]) => (
                <a key={key} href={`#${key}`} onClick={e => (e.preventDefault(), document.getElementById(key)?.scrollIntoView({ behavior: 'smooth' }))} className="rounded-lg px-3 py-1.5 text-muted hover:bg-gray-50 hover:text-ink">
                  {label}
                </a>
              ))}
            </nav>
          </Card>
        </aside>
      </div>
    </>
  )
}
