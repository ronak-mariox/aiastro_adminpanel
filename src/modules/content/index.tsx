import { FileText, Newspaper, Quote } from 'lucide-react'
import { WithApiErrors } from '@/lib/RemoteErrors'
import type { AdminModule } from '../types'
import BlogEditor from './BlogEditor'
import BlogsPage from './BlogsPage'
import PagesPage from './PagesPage'
import TestimonialsPage from './TestimonialsPage'
import { blogsDb } from './data'

const module: AdminModule = {
  nav: [
    { label: 'Blogs', path: '/blogs', icon: Newspaper, group: 'Content', badge: () => blogsDb.snapshot().filter(p => p.status === 'draft').length },
    { label: 'Pages & FAQs', path: '/pages', icon: FileText, group: 'Content' },
    { label: 'Testimonials', path: '/testimonials', icon: Quote, group: 'Content' },
  ],
  routes: [
    { path: 'blogs', element: <WithApiErrors><BlogsPage /></WithApiErrors> },
    { path: 'blogs/new', element: <WithApiErrors><BlogEditor /></WithApiErrors> },
    { path: 'blogs/:id', element: <WithApiErrors><BlogEditor /></WithApiErrors> },
    { path: 'pages', element: <WithApiErrors><PagesPage /></WithApiErrors> },
    { path: 'testimonials', element: <WithApiErrors><TestimonialsPage /></WithApiErrors> },
  ],
}

export default module
