import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Download, Gem, IndianRupee, PackageCheck, Plus, Star } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, CardBody, CardHeader, DataTable, PageHeader, StatCard, Tabs, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatINR, formatNumber } from '@/lib/utils'
import { categoriesDb, discountPct, productStatus, productsDb, purposesDb, totalStock } from '../data'
import { ProductStatusBadge, ProductThumb } from '../shared'
import { downloadCsv } from '../lib'
import type { Product } from '../types'
import CategoriesPanel from './CategoriesPanel'

type TabKey = 'products' | 'taxonomy'

export default function ProductsPage() {
  const [tab, setTab] = useState<TabKey>('products')
  const navigate = useNavigate()
  const { items, loading } = useCollection(productsDb)
  const { items: categories } = useCollection(categoriesDb)
  const { items: purposes } = useCollection(purposesDb)

  const stats = useMemo(() => {
    const active = items.filter(p => productStatus(p) === 'active').length
    const oos = items.filter(p => productStatus(p) === 'out of stock').length
    const low = items.filter(p => p.published && totalStock(p) > 0 && totalStock(p) <= p.lowStockAt).length
    const gmv = items.reduce((s, p) => s + p.sold * p.price, 0)
    const sold = items.reduce((s, p) => s + p.sold, 0)
    return { active, oos, low, gmv, sold }
  }, [items])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    items.forEach(p => map.set(p.category, (map.get(p.category) ?? 0) + p.sold))
    return [...map.entries()].map(([name, sold]) => ({ name, sold })).sort((a, b) => b.sold - a.sold)
  }, [items])

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      sortValue: p => p.name,
      render: p => (
        <div className="flex min-w-60 items-center gap-3">
          <ProductThumb src={p.images[0]} name={p.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{p.name}</p>
            <p className="text-xs text-muted">
              {p.sku}
              {p.variants.length > 0 && ` · ${p.variants.length} variants`}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', sortValue: p => p.category, render: p => <span className="whitespace-nowrap">{p.category}</span> },
    {
      key: 'purpose',
      header: 'Purpose',
      render: p => (
        <div className="flex flex-wrap gap-1">
          {p.purposes.map(x => (
            <Badge key={x} tone="orange">
              {x}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: 'price', header: 'Price', align: 'right', sortValue: p => p.price, render: p => <span className="font-medium">{formatINR(p.price)}</span> },
    { key: 'mrp', header: 'MRP', align: 'right', sortValue: p => p.mrp, render: p => <span className="text-muted line-through">{formatINR(p.mrp)}</span> },
    {
      key: 'discount',
      header: 'Disc.',
      align: 'right',
      sortValue: p => discountPct(p.price, p.mrp),
      render: p => <span className="font-medium text-emerald-600">{discountPct(p.price, p.mrp)}%</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      sortValue: p => totalStock(p),
      render: p => {
        const s = totalStock(p)
        return <span className={s === 0 ? 'font-medium text-red-600' : s <= p.lowStockAt ? 'font-medium text-amber-600' : ''}>{formatNumber(s)}</span>
      },
    },
    { key: 'status', header: 'Status', sortValue: p => productStatus(p), render: p => <ProductStatusBadge status={productStatus(p)} /> },
    {
      key: 'rating',
      header: 'Rating',
      sortValue: p => p.rating,
      render: p => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Star className="size-3.5 fill-gold-400 text-gold-400" />
          {p.rating.toFixed(1)} <span className="text-xs text-muted">({formatNumber(p.reviews)})</span>
        </span>
      ),
    },
    { key: 'sold', header: 'Sold', align: 'right', sortValue: p => p.sold, render: p => formatNumber(p.sold) },
  ]

  const exportCsv = () =>
    downloadCsv(`astrovati-products-${new Date().toISOString().slice(0, 10)}.csv`, items, [
      { header: 'ID', value: p => p.id },
      { header: 'SKU', value: p => p.sku },
      { header: 'Name', value: p => p.name },
      { header: 'Category', value: p => p.category },
      { header: 'Purposes', value: p => p.purposes.join(' | ') },
      { header: 'Price', value: p => p.price },
      { header: 'MRP', value: p => p.mrp },
      { header: 'Discount %', value: p => discountPct(p.price, p.mrp) },
      { header: 'Stock', value: p => totalStock(p) },
      { header: 'Status', value: p => productStatus(p) },
      { header: 'Rating', value: p => p.rating },
      { header: 'Sold', value: p => p.sold },
    ])

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="AstroVati spiritual store catalogue — gemstones, rudraksha, bracelets & more"
        actions={
          <>
            <Button variant="outline" icon={<Download className="size-4" />} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => navigate('/products/new')}>
              Add product
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Live products" value={formatNumber(stats.active)} icon={Gem} hint={`of ${items.length} in catalogue`} />
        <StatCard label="Out of stock" value={formatNumber(stats.oos)} icon={AlertTriangle} tone="gold" hint={`${stats.low} running low`} />
        <StatCard label="Units sold" value={formatNumber(stats.sold)} icon={PackageCheck} tone="green" hint="all time" />
        <StatCard label="Lifetime GMV" value={formatINR(stats.gmv)} icon={IndianRupee} tone="purple" />
      </div>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'products', label: 'All products', count: items.length },
          { key: 'taxonomy', label: 'Categories & Purposes', count: categories.length + purposes.length },
        ]}
      />

      {tab === 'products' ? (
        <div className="space-y-6">
          <DataTable
            rows={items}
            columns={columns}
            rowKey={p => p.id}
            loading={loading}
            searchText={p => `${p.name} ${p.sku} ${p.category} ${p.planet}`}
            searchPlaceholder="Search name, SKU, planet…"
            onRowClick={p => navigate(`/products/${p.id}`)}
            filters={[
              { key: 'category', label: 'Category', options: categories.map(c => c.name), match: (p, v) => p.category === v },
              { key: 'purpose', label: 'Purpose', options: purposes.map(c => c.name), match: (p, v) => p.purposes.includes(v) },
              { key: 'status', label: 'Status', options: ['Active', 'Draft', 'Out of stock'], match: (p, v) => productStatus(p) === v.toLowerCase() },
            ]}
          />
          <Card>
            <CardHeader title="Units sold by category" subtitle="Lifetime, all channels" />
            <CardBody className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={v => formatNumber(Number(v))} />
                  <Bar dataKey="sold" name="Units" fill="#c8102e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </div>
      ) : (
        <CategoriesPanel />
      )}
    </>
  )
}
