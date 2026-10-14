import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, Download, Eye, FilePen, Newspaper, Plus, Star, Tags } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar, Button, Card, CardBody, CardHeader, DataTable, PageHeader, StatCard, StatusBadge, useToast, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { downloadCsv } from '../marketing/utils'
import { CategoryChip } from './CategoryChip'
import { CategoryManager } from './CategoryManager'
import { blogCategoriesDb, blogsDb } from './data'
import type { BlogPost } from './types'

export default function BlogsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { items, loading, update } = useCollection(blogsDb)
  const { items: categories } = useCollection(blogCategoriesDb)
  const [catsOpen, setCatsOpen] = useState(false)
  const cat = (id: string) => categories.find(c => c.id === id)

  const stats = useMemo(
    () => ({
      published: items.filter(p => p.status === 'published').length,
      scheduled: items.filter(p => p.status === 'scheduled').length,
      drafts: items.filter(p => p.status === 'draft').length,
      views: items.reduce((s, p) => s + p.views, 0),
    }),
    [items],
  )

  const chart = useMemo(
    () => categories.map(c => ({ name: c.name, color: c.color, views: items.filter(p => p.categoryId === c.id).reduce((s, p) => s + p.views, 0) })),
    [categories, items],
  )

  const toggleFeatured = async (p: BlogPost) => {
    await update(p.id, { featured: !p.featured })
    toast(p.featured ? 'Removed from featured' : 'Marked as featured')
  }

  const columns: Column<BlogPost>[] = [
    {
      key: 'title',
      header: 'Post',
      sortValue: p => p.title,
      render: p => (
        <div className="flex min-w-72 items-center gap-3">
          <img src={p.coverImage} alt="" className="h-12 w-20 shrink-0 rounded-lg bg-gray-100 object-cover" />
          <div className="min-w-0">
            <p className="line-clamp-2 font-medium">{p.title}</p>
            <p className="truncate text-xs text-muted">/blogs/{p.slug}</p>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', sortValue: p => cat(p.categoryId)?.name ?? '', render: p => <CategoryChip category={cat(p.categoryId)} /> },
    {
      key: 'author',
      header: 'Author',
      sortValue: p => (p.authorId || 'Shree Astro'),
      render: p => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Avatar name={(p.authorId || 'Shree Astro')} size={26} />
          {(p.authorId || 'Shree Astro')}
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: p => <StatusBadge status={p.status} /> },
    { key: 'date', header: 'Publish date', sortValue: p => p.publishDate, render: p => <span className="whitespace-nowrap">{formatDate(p.publishDate)}</span> },
    { key: 'read', header: 'Read', align: 'right', sortValue: p => p.readTime, render: p => `${p.readTime} min` },
    { key: 'views', header: 'Views', align: 'right', sortValue: p => p.views, render: p => formatNumber(p.views) },
    {
      key: 'featured',
      header: 'Featured',
      align: 'center',
      sortValue: p => Number(p.featured),
      render: p => (
        <button
          type="button"
          aria-label="Toggle featured"
          onClick={e => {
            e.stopPropagation()
            toggleFeatured(p)
          }}
          className="rounded-lg p-1.5 hover:bg-gray-100">
          <Star className={cn('size-4', p.featured ? 'fill-gold-400 text-gold-500' : 'text-gray-300')} />
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Blogs"
        subtitle="Articles shown on vedrashi.com/blogs and the UserApp learn section"
        actions={
          <>
            <Button variant="outline" icon={<Tags className="size-4" />} onClick={() => setCatsOpen(true)}>
              Categories
            </Button>
            <Button icon={<Plus className="size-4" />} onClick={() => navigate('/blogs/new')}>
              New post
            </Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Published" value={stats.published} icon={Newspaper} hint={`${items.length} posts total`} />
        <StatCard label="Scheduled" value={stats.scheduled} icon={CalendarClock} tone="blue" />
        <StatCard label="Drafts" value={stats.drafts} icon={FilePen} tone="purple" />
        <StatCard label="Total views" value={formatNumber(stats.views)} icon={Eye} tone="gold" hint="all time" />
      </div>

      <Card className="mb-6">
        <CardHeader title="Views by category" />
        <CardBody className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: -8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ece9ea" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <Tooltip formatter={v => formatNumber(Number(v))} />
              <Bar dataKey="views" name="Views" radius={[6, 6, 0, 0]}>
                {chart.map(c => (
                  <Cell key={c.name} fill={c.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <DataTable
        rows={items}
        columns={columns}
        rowKey={p => p.id}
        loading={loading}
        searchText={p => `${p.title} ${p.slug} ${(p.authorId || 'Shree Astro')} ${p.excerpt}`}
        searchPlaceholder="Search title, author…"
        onRowClick={p => navigate(`/blogs/${p.id}`)}
        filters={[
          { key: 'status', label: 'Status', options: ['published', 'scheduled', 'draft'], match: (p, v) => p.status === v },
          { key: 'category', label: 'Category', options: categories.map(c => c.name), match: (p, v) => cat(p.categoryId)?.name === v },
          { key: 'featured', label: 'Featured', options: ['Yes', 'No'], match: (p, v) => p.featured === (v === 'Yes') },
        ]}
        toolbar={
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="size-4" />}
            onClick={() =>
              downloadCsv(
                'blogs.csv',
                items.map(p => ({ id: p.id, title: p.title, slug: p.slug, category: cat(p.categoryId)?.name, author: (p.authorId || 'Shree Astro'), status: p.status, publishDate: p.publishDate, views: p.views, featured: p.featured })),
              )
            }>
            Export
          </Button>
        }
      />
      {catsOpen && <CategoryManager onClose={() => setCatsOpen(false)} />}
    </>
  )
}
