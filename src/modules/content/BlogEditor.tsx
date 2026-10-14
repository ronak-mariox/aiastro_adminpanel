import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImageOff, Save, Send, Trash2 } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Segmented, Select, StatusBadge, Textarea, Toggle, useConfirm, useToast } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatDateTime, newId } from '@/lib/utils'
import { nowIso, todayStr } from '../marketing/utils'
import { Markdown } from './Markdown'
import { authorsDb, blogCategoriesDb, blogsDb, readTimeOf, slugify } from './data'
import type { BlogPost, BlogStatus } from './types'

type Draft = Omit<BlogPost, 'id' | 'views' | 'createdAt' | 'updatedAt' | 'readTime'>

export default function BlogEditor() {
  const { id } = useParams()
  const { items, loading } = useCollection(blogsDb)
  const isNew = !id || id === 'new'
  const post = isNew ? undefined : items.find(p => p.id === id)

  if (!isNew && loading && !post) return <Card className="h-96 animate-pulse" />
  if (!isNew && !post)
    return (
      <Card>
        <EmptyState title="Post not found" text={`No blog post with id ${id}.`} />
      </Card>
    )
  return <BlogForm key={post?.id ?? 'new'} post={post} />
}

function BlogForm({ post }: { post?: BlogPost }) {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const { items: categories } = useCollection(blogCategoriesDb)
  const { items: astrologers } = useCollection(authorsDb)
  const [d, setD] = useState<Draft>(
    post ?? {
      title: '',
      slug: '',
      categoryId: categories[0]?.id ?? '',
      authorId: 'Shree Astro Team',
      coverImage: '',
      excerpt: '',
      body: '',
      status: 'draft',
      publishDate: todayStr(),
      seoTitle: '',
      seoDescription: '',
      featured: false,
    },
  )
  const [slugTouched, setSlugTouched] = useState(!!post)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [imgFailed, setImgFailed] = useState('')
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(x => ({ ...x, [k]: v }))
  const readTime = readTimeOf(d.body)

  const setTitle = (title: string) => setD(x => ({ ...x, title, slug: slugTouched ? x.slug : slugify(title) }))

  const save = async (status: BlogStatus) => {
    const e: Record<string, string> = {}
    if (!d.title.trim()) e.title = 'Title is required'
    if (!/^[a-z0-9-]+$/.test(d.slug)) e.slug = 'Lowercase letters, numbers and hyphens only'
    else if (blogsDb.snapshot().some(p => p.slug === d.slug && p.id !== post?.id)) e.slug = 'Slug already in use'
    if (status !== 'draft') {
      if (!d.excerpt.trim()) e.excerpt = 'Excerpt is required to publish'
      if (d.body.trim().length < 50) e.body = 'Body is too short to publish'
      if (status === 'scheduled' && d.publishDate <= todayStr()) e.publishDate = 'Scheduled date must be in the future'
    }
    setErrors(e)
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields', 'error')
      return
    }
    setSaving(true)
    const now = nowIso()
    const payload = {
      ...d,
      status,
      title: d.title.trim(),
      publishDate: status === 'published' && d.publishDate > todayStr() ? todayStr() : d.publishDate,
      seoTitle: d.seoTitle.trim() || `${d.title.trim().slice(0, 50)} | Shree Astro`,
      seoDescription: d.seoDescription.trim() || d.excerpt.slice(0, 155),
      readTime,
      updatedAt: now,
    }
    try {
      if (post) {
        await blogsDb.update(post.id, payload)
      } else {
        const created = await blogsDb.create({ ...payload, id: newId('BLG'), views: 0, createdAt: now })
        navigate(`/blogs/${created.id}`, { replace: true })
      }
      toast(status === 'published' ? 'Post published' : status === 'scheduled' ? 'Post scheduled' : 'Draft saved')
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!post) return
    const ok = await confirm({ title: 'Delete this post?', message: post.title, confirmLabel: 'Delete', tone: 'danger' })
    if (ok === false) return
    await blogsDb.remove(post.id)
    toast('Post deleted')
    navigate('/blogs')
  }

  const futureDate = d.publishDate > todayStr()

  return (
    <>
      <PageHeader
        title={post ? 'Edit post' : 'New post'}
        subtitle={post ? `Last updated ${formatDateTime(post.updatedAt)}` : 'Write a new article for the blog'}
        breadcrumbs={[{ label: 'Blogs', to: '/blogs' }, { label: post ? post.title.slice(0, 40) : 'New post' }]}
        actions={
          <>
            <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => navigate('/blogs')}>
              Back
            </Button>
            {post && (
              <Button variant="outline" icon={<Trash2 className="size-4" />} onClick={del}>
                Delete
              </Button>
            )}
            <Button variant="outline" icon={<Save className="size-4" />} disabled={saving} onClick={() => save('draft')}>
              Save draft
            </Button>
            <Button icon={<Send className="size-4" />} loading={saving} onClick={() => save(futureDate ? 'scheduled' : 'published')}>
              {futureDate ? 'Schedule' : 'Publish'}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardBody className="space-y-4">
              <Input label="Title" value={d.title} onChange={e => setTitle(e.target.value)} error={errors.title} placeholder="Saturn Transit 2026: …" />
              <Input
                label="Slug"
                hint={`vedrashi.com/blogs/${d.slug || '…'}`}
                value={d.slug}
                onChange={e => {
                  setSlugTouched(true)
                  set('slug', slugify(e.target.value))
                }}
                error={errors.slug}
              />
              <Textarea label="Excerpt" hint={`${d.excerpt.length}/200`} maxLength={200} rows={2} value={d.excerpt} onChange={e => set('excerpt', e.target.value)} error={errors.excerpt} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Body"
              subtitle={`Markdown supported · ${readTime} min read`}
              action={
                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { key: 'write', label: 'Write' },
                    { key: 'preview', label: 'Preview' },
                  ]}
                />
              }
            />
            <CardBody>
              {mode === 'write' ? (
                <Textarea
                  rows={18}
                  className="font-mono text-[13px]"
                  value={d.body}
                  onChange={e => set('body', e.target.value)}
                  error={errors.body}
                  placeholder={'## Heading\n\nParagraph with **bold** and *italic*.\n\n- bullet point'}
                />
              ) : (
                <div className="min-h-80 rounded-xl border border-line p-5">
                  <h1 className="mb-2 text-2xl font-bold">{d.title || 'Untitled'}</h1>
                  <Markdown source={d.body} />
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Publishing" action={<StatusBadge status={post?.status ?? 'draft'} />} />
            <CardBody className="space-y-4">
              <Input label="Publish date" hint={futureDate ? 'Will be scheduled' : undefined} type="date" value={d.publishDate} onChange={e => set('publishDate', e.target.value)} error={errors.publishDate} />
              <Select label="Category" value={d.categoryId} options={categories.map(c => ({ value: c.id, label: c.name }))} onChange={e => set('categoryId', e.target.value)} />
              <Select label="Author (astrologer)" value={d.authorId} options={[...new Set(['Shree Astro Team', ...astrologers.map(a => a.name), d.authorId].filter(Boolean))].map(n => ({ value: n, label: n }))} onChange={e => set('authorId', e.target.value)} />
              <Toggle checked={d.featured} onChange={v => set('featured', v)} label="Featured on blog home" />
              {post && post.status === 'published' && (
                <Button variant="outline" size="sm" onClick={() => save('draft')}>
                  Unpublish (move to draft)
                </Button>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Cover image" />
            <CardBody className="space-y-3">
              <Input value={d.coverImage} placeholder="https://cdn.vedrashi.com/blog/…" onChange={e => set('coverImage', e.target.value)} />
              <div className="aspect-[1200/630] overflow-hidden rounded-xl bg-gray-100">
                {d.coverImage && imgFailed !== d.coverImage ? (
                  <img src={d.coverImage} alt="" className="h-full w-full object-cover" onError={() => setImgFailed(d.coverImage)} />
                ) : (
                  <div className="flex h-full items-center justify-center gap-2 text-sm text-muted">
                    <ImageOff className="size-4" /> {d.coverImage ? 'Image failed to load' : 'No cover image'}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="SEO" />
            <CardBody className="space-y-4">
              <Input label="SEO title" hint={`${d.seoTitle.length}/60`} value={d.seoTitle} placeholder={d.title ? `${d.title.slice(0, 50)} | VedRashi` : ''} onChange={e => set('seoTitle', e.target.value)} />
              <Textarea label="Meta description" hint={`${d.seoDescription.length}/160`} rows={3} value={d.seoDescription} placeholder={d.excerpt} onChange={e => set('seoDescription', e.target.value)} />
              <div className="rounded-xl border border-line p-3">
                <p className="truncate text-xs text-emerald-700">vedrashi.com › blogs › {d.slug || '…'}</p>
                <p className="truncate text-sm font-medium text-sky-700">{d.seoTitle || d.title || 'Page title'}</p>
                <p className="line-clamp-2 text-xs text-muted">{d.seoDescription || d.excerpt || 'Meta description preview.'}</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
