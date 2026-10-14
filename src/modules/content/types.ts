export interface BlogCategory {
  id: string
  name: string
  slug: string
  color: string
  description: string
}

export type BlogStatus = 'draft' | 'published' | 'scheduled'

export interface BlogPost {
  id: string
  title: string
  slug: string
  categoryId: string
  /** Astrologer id (AST…) credited as author. */
  authorId: string
  coverImage: string
  excerpt: string
  /** Simple markdown (#, ##, -, **bold**, *italic*). */
  body: string
  readTime: number
  status: BlogStatus
  publishDate: string
  seoTitle: string
  seoDescription: string
  featured: boolean
  views: number
  createdAt: string
  updatedAt: string
}

export interface LegalSection {
  id: string
  title: string
  body: string
}

export interface LegalPage {
  id: string // slug: privacy | terms | refund | cancellation | cookie | community
  title: string
  subtitle: string
  sections: LegalSection[]
  published: boolean
  updatedAt: string
  updatedBy: string
}

export type FaqGroup = 'Account & Wallet' | 'Consultations' | 'Puja Booking' | 'Product Orders' | 'Website · Home' | 'Website · Contact'

export interface Faq {
  id: string
  group: FaqGroup
  question: string
  answer: string
  order: number
  active: boolean
}

export interface HomeStat {
  id: string
  label: string
  value: string
  order: number
}

export interface TimelineItem {
  id: string
  year: string
  text: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  bio: string
  photoUrl: string
  order: number
  active: boolean
}

export interface ServicePlan {
  id: string
  name: string
  price: string
  text: string
  popular: boolean
}

export interface ServiceFaq {
  id: string
  q: string
  a: string
}

export interface ServicePage {
  id: string // slug
  title: string
  tagline: string
  plans: ServicePlan[]
  faqs: ServiceFaq[]
  updatedAt: string
}

export type TestimonialSurface = 'app' | 'store' | 'website'

export interface Testimonial {
  id: string
  name: string
  city: string
  rating: number
  text: string
  photoUrl: string
  showOn: TestimonialSurface[]
  service: 'Consultation' | 'Puja' | 'Store' | 'General'
  featured: boolean
  active: boolean
  createdAt: string
}
