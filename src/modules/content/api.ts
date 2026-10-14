// Content ↔ Shree Astro admin API.
//   blogs         GET/POST /admin/articles, PUT/DELETE /admin/articles/:id (category = the category's name)
//   blog cats     site-content `blog-categories`
//   legal pages   GET/POST /admin/pages, GET/PUT /admin/pages/:slug (sections ↔ markdown body)
//   faqs          GET/POST /admin/faqs, PUT/DELETE /admin/faqs/:id
//   testimonials  GET/POST /admin/testimonials, PUT/DELETE /admin/testimonials/:id, PATCH …/status
//   website       site-content `site-home-stats`, `site-timeline`, `site-team`, `site-service-pages`
//   authors       GET /admin/astrologers (names for the blog by-line)

import { api } from '@/lib/api'
import { createContentListCollection, createRemoteCollection, fetchAll } from '@/lib/remoteCollection'
import type { BlogCategory, BlogPost, Faq, FaqGroup, HomeStat, LegalPage, LegalSection, ServicePage, TeamMember, Testimonial, TimelineItem } from './types'

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

// ------------------------------------------------------------ categories

export const createBlogCategoriesDb = (seed: () => BlogCategory[]) => createContentListCollection<BlogCategory>('blog-categories', seed)

// ----------------------------------------------------------------- blogs

type SArticle = {
  id?: string
  _id?: string
  title: string
  slug: string
  category?: string
  author?: string
  excerpt?: string
  body?: string
  coverImageUrl?: string
  readMinutes?: number
  status: 'draft' | 'published' | 'archived'
  views?: number
  publishedAt?: string
  featured?: boolean
  seoTitle?: string
  seoDescription?: string
  createdAt: string
  updatedAt: string
}

type CategoriesRef = { snapshot: () => BlogCategory[]; list: () => Promise<BlogCategory[]> }
let categoriesRef: CategoriesRef | null = null
/** data.ts hands over the categories collection (avoids an import cycle). */
export const registerBlogCategories = (c: CategoriesRef) => {
  categoriesRef = c
}
const categories = async () => (categoriesRef ? (categoriesRef.snapshot().length ? categoriesRef.snapshot() : await categoriesRef.list()) : [])

const today = () => new Date().toISOString().slice(0, 10)

export function toPost(a: SArticle, cats: BlogCategory[]): BlogPost {
  const name = a.category ?? ''
  const cat = cats.find(c => c.name.toLowerCase() === name.toLowerCase() || c.slug === slug(name))
  const publishDate = (a.publishedAt ?? a.createdAt).slice(0, 10)
  const status: BlogPost['status'] = a.status === 'published' ? (publishDate > today() ? 'scheduled' : 'published') : 'draft'
  return {
    id: String(a.id ?? a._id),
    title: a.title,
    slug: a.slug,
    categoryId: cat?.id ?? (name ? `name:${name}` : ''),
    authorId: a.author ?? '',
    coverImage: a.coverImageUrl ?? '',
    excerpt: a.excerpt ?? '',
    body: a.body ?? '',
    readTime: a.readMinutes ?? 1,
    status,
    publishDate,
    seoTitle: a.seoTitle ?? '',
    seoDescription: a.seoDescription ?? '',
    featured: !!a.featured,
    views: a.views ?? 0,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }
}

function articlePayload(p: BlogPost, cats: BlogCategory[]) {
  const category = p.categoryId.startsWith('name:') ? p.categoryId.slice(5) : (cats.find(c => c.id === p.categoryId)?.name ?? '')
  return {
    title: p.title,
    slug: p.slug,
    category,
    author: p.authorId,
    excerpt: p.excerpt,
    body: p.body,
    coverImageUrl: p.coverImage,
    // A scheduled post is published with a future date; the site shows it from that day.
    status: p.status === 'draft' ? 'draft' : 'published',
    publishedAt: p.status === 'draft' ? undefined : new Date(`${p.publishDate}T06:00:00`).toISOString(),
    featured: p.featured,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
  }
}

export const blogsDb = createRemoteCollection<BlogPost>({
  list: async () => {
    const [cats, rows] = await Promise.all([categories(), fetchAll<SArticle>('/admin/articles')])
    return rows.filter(a => a.status !== 'archived').map(a => toPost(a, cats))
  },
  create: async p => {
    const cats = await categories()
    return toPost((await api.post<{ article: SArticle }>('/admin/articles', articlePayload(p, cats))).article, cats)
  },
  update: async (id, patch, current) => {
    const cats = await categories()
    return toPost((await api.put<{ article: SArticle }>(`/admin/articles/${id}`, articlePayload({ ...current, ...patch }, cats))).article, cats)
  },
  remove: async id => {
    await api.del(`/admin/articles/${id}`)
  },
})

/** Astrologer names for the by-line picker. */
export const authorsDb = createRemoteCollection<{ id: string; name: string }>({
  list: async () =>
    (await fetchAll<{ id: string; name?: string; applicationStatus?: string }>('/admin/astrologers', { status: 'approved' }))
      .filter(a => a.name)
      .map(a => ({ id: a.id, name: a.name! })),
})

// ----------------------------------------------------------- legal pages

/** The panel's page ids ↔ the API slugs the apps open. */
const LEGAL_SLUGS: Record<string, string> = {
  privacy: 'privacy-policy',
  terms: 'terms-and-conditions',
  refund: 'refund-policy',
  cancellation: 'cancellation-policy',
  cookie: 'cookie-policy',
  community: 'community-guidelines',
}

type SPage = { id: string; slug: string; title: string; body?: string; isPublished?: boolean; updatedAt: string }

/** `subtitle\n\n## Section\n\nbody…` — readable as markdown in the apps, and parsed back here. */
export const sectionsToBody = (p: Pick<LegalPage, 'subtitle' | 'sections'>) =>
  [p.subtitle.trim(), ...p.sections.map(s => `## ${s.title.trim()}\n\n${s.body.trim()}`)].filter(Boolean).join('\n\n')

export function bodyToSections(body: string, pageId: string): { subtitle: string; sections: LegalSection[] } {
  const parts = body.split(/^## /m)
  const subtitle = (parts.shift() ?? '').trim()
  const sections = parts.map((part, i) => {
    const [title, ...rest] = part.split('\n')
    return { id: `${pageId}-${i + 1}`, title: (title ?? '').trim(), body: rest.join('\n').trim() }
  })
  return { subtitle, sections }
}

/**
 * The six legal pages, by the panel's ids. A page that is not stored yet shows
 * the panel's own starting text (`seed`) and is created on its first save.
 */
export const createLegalPagesDb = (seed: () => LegalPage[]) =>
  createRemoteCollection<LegalPage>({
    list: async () => {
      const { items } = await api.get<{ items: SPage[] }>('/admin/pages')
      const bySlug = new Map(items.map(p => [p.slug, p]))
      return Promise.all(
        seed().map(async base => {
          const stored = bySlug.get(LEGAL_SLUGS[base.id] ?? base.id)
          if (!stored) return { ...base, published: false, updatedBy: 'Not saved yet' }
          const { page } = await api.get<{ page: SPage }>(`/admin/pages/${stored.slug}`)
          const { subtitle, sections } = bodyToSections(page.body ?? '', base.id)
          return { ...base, title: page.title, subtitle, sections, published: page.isPublished !== false, updatedAt: page.updatedAt, updatedBy: 'Admin' }
        }),
      )
    },
    update: async (id, patch, current) => {
      const next = { ...current, ...patch }
      const pageSlug = LEGAL_SLUGS[id] ?? id
      const body = { title: next.title, body: sectionsToBody(next) || next.title, isPublished: next.published }
      let page: SPage
      try {
        page = (await api.put<{ page: SPage }>(`/admin/pages/${pageSlug}`, body)).page
      } catch (e) {
        if ((e as { status?: number }).status !== 404) throw e
        page = (await api.post<{ page: SPage }>('/admin/pages', { slug: pageSlug, ...body })).page
      }
      return { ...next, updatedAt: page.updatedAt, updatedBy: 'Admin' }
    },
  })

// ------------------------------------------------------------------ faqs

type SFaq = { id: string; category: string; question: string; answer: string; audience?: string; sortOrder?: number; isActive?: boolean }

const toFaq = (f: SFaq): Faq => ({ id: f.id, group: f.category as FaqGroup, question: f.question, answer: f.answer, order: f.sortOrder ?? 0, active: f.isActive !== false })
const faqBody = (f: Partial<Faq>) => ({
  ...(f.group !== undefined ? { category: f.group, audience: 'all' } : {}),
  ...(f.question !== undefined ? { question: f.question } : {}),
  ...(f.answer !== undefined ? { answer: f.answer } : {}),
  ...(f.order !== undefined ? { sortOrder: f.order } : {}),
  ...(f.active !== undefined ? { isActive: f.active } : {}),
})

export const faqsDb = createRemoteCollection<Faq>({
  list: async () => (await api.get<{ items: SFaq[] }>('/admin/faqs')).items.map(toFaq),
  create: async f => toFaq((await api.post<{ faq: SFaq }>('/admin/faqs', faqBody(f))).faq),
  update: async (id, patch) => toFaq((await api.put<{ faq: SFaq }>(`/admin/faqs/${id}`, faqBody(patch))).faq),
  remove: async id => {
    await api.del(`/admin/faqs/${id}`)
  },
})

// ----------------------------------------------------------- testimonials

type STestimonial = {
  id: string
  kind: 'video' | 'story'
  title: string
  quote?: string
  name: string
  city?: string
  tag?: string
  avatarUrl?: string
  status: 'published' | 'draft'
  rating?: number
  showOn?: Testimonial['showOn']
  featured?: boolean
  createdAt: string
}

const SERVICES: Testimonial['service'][] = ['Consultation', 'Puja', 'Store', 'General']

const toTestimonial = (t: STestimonial): Testimonial => ({
  id: t.id,
  name: t.name,
  city: t.city ?? '',
  rating: t.rating ?? 5,
  text: t.quote ?? '',
  photoUrl: t.avatarUrl ?? '',
  showOn: t.showOn?.length ? t.showOn : ['website'],
  service: (SERVICES as string[]).includes(t.tag ?? '') ? (t.tag as Testimonial['service']) : 'General',
  featured: !!t.featured,
  active: t.status === 'published',
  createdAt: t.createdAt,
})

const titleFrom = (text: string) => {
  const first = text.trim().split(/[.!?]/)[0] ?? ''
  return (first.length > 80 ? `${first.slice(0, 77)}…` : first) || 'Customer story'
}

const testimonialBody = (t: Testimonial, current?: Testimonial) => ({
  ...(current ? {} : { kind: 'story' }),
  title: titleFrom(t.text),
  quote: t.text,
  name: t.name,
  city: t.city,
  tag: t.service,
  avatarUrl: t.photoUrl,
  status: t.active ? 'published' : 'draft',
  rating: t.rating,
  showOn: t.showOn,
  featured: t.featured,
})

export const testimonialsDb = createRemoteCollection<Testimonial>({
  list: async () => (await fetchAll<STestimonial>('/admin/testimonials')).map(toTestimonial),
  create: async t => toTestimonial((await api.post<{ testimonial: STestimonial }>('/admin/testimonials', testimonialBody(t))).testimonial),
  update: async (id, patch, current) => {
    const keys = Object.keys(patch)
    if (keys.length === 1 && keys[0] === 'active') {
      return toTestimonial((await api.patch<{ testimonial: STestimonial }>(`/admin/testimonials/${id}/status`, { status: patch.active ? 'published' : 'draft' })).testimonial)
    }
    return toTestimonial((await api.put<{ testimonial: STestimonial }>(`/admin/testimonials/${id}`, testimonialBody({ ...current, ...patch }, current))).testimonial)
  },
  remove: async id => {
    await api.del(`/admin/testimonials/${id}`)
  },
})

// --------------------------------------------------------------- website

export const createHomeStatsDb = (seed: () => HomeStat[]) => createContentListCollection<HomeStat>('site-home-stats', seed)
export const createTimelineDb = (seed: () => TimelineItem[]) => createContentListCollection<TimelineItem>('site-timeline', seed)
export const createTeamDb = (seed: () => TeamMember[]) => createContentListCollection<TeamMember>('site-team', seed)
export const createServicePagesDb = (seed: () => ServicePage[]) => createContentListCollection<ServicePage>('site-service-pages', seed)
