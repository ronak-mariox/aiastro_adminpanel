import { authorsDb, blogsDb, createBlogCategoriesDb, createHomeStatsDb, createLegalPagesDb, createServicePagesDb, createTeamDb, createTimelineDb, faqsDb, registerBlogCategories, testimonialsDb } from './api'

// Live collections (Shree Astro admin API) — see ./api.ts. The lists below are only starting
// content shown until an admin first saves that list.
export { authorsDb, blogsDb, faqsDb, testimonialsDb }
import type { BlogCategory, FaqGroup, LegalPage, TestimonialSurface } from './types'

// ---------- Blog ----------

const blogCategoriesSeed: BlogCategory[] = [
  { id: 'CAT1', name: 'Astrology Tips', slug: 'astrology-tips', color: '#c8102e', description: 'Practical astrology for everyday decisions.' },
  { id: 'CAT2', name: 'Festival Guide', slug: 'festival-guide', color: '#f77f00', description: 'Rituals, muhurat and significance of Hindu festivals.' },
  { id: 'CAT3', name: 'Horoscope Insights', slug: 'horoscope-insights', color: '#4cc9f0', description: 'Sign-wise forecasts and transit analysis.' },
  { id: 'CAT4', name: 'Vastu Shastra', slug: 'vastu-shastra', color: '#06d6a0', description: 'Directions, placements and remedies for home & office.' },
  { id: 'CAT5', name: 'Spiritual Content', slug: 'spiritual-content', color: '#c77dff', description: 'Mantras, Rudraksha, gemstones and sadhana.' },
  { id: 'CAT6', name: 'Vedic Astrology', slug: 'vedic-astrology', color: '#ffd700', description: 'Kundli, nakshatras, dashas and classical Jyotish.' },
]
export const blogCategoriesDb = createBlogCategoriesDb(() => blogCategoriesSeed)
registerBlogCategories(blogCategoriesDb)

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)

/** ~200 words per minute, minimum 1. */
export const readTimeOf = (body: string) => Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 200))

// ---------- Legal pages ----------

const s = (id: string, title: string, body: string) => ({ id, title, body })

const legalSeed: LegalPage[] = [
  {
    id: 'privacy',
    title: 'Privacy Policy',
    subtitle: 'How we collect, use, and protect your personal information',
    published: true,
    updatedAt: '2026-06-01T10:00:00',
    updatedBy: 'Legal Team',
    sections: [
      s('p1', 'Introduction', 'At VedRashi, your privacy is sacred to us. This policy explains how we collect, use, share and safeguard your personal information when you use our website and apps.'),
      s('p2', 'Information We Collect', 'Name, email, phone number, date, time and place of birth; usage data such as pages visited and device information; payment metadata processed by PCI-DSS compliant gateways; consultation data with your consent.'),
      s('p3', 'How We Use Your Information', 'To provide and personalise astrology, pandit booking and store services; process payments; match you with suitable experts; send updates you can opt out of; prevent fraud; and comply with law.'),
      s('p4', 'How We Share Your Information', 'Birth details are shared only with the expert you choose. Trusted vendors for payments, hosting and analytics are contractually bound to protect your data. We never sell your personal information.'),
      s('p5', 'Data Security', 'SSL/TLS in transit, AES-256 at rest, restricted access on a need-to-know basis, access logs and regular penetration tests.'),
      s('p6', 'Your Rights', 'You may access, correct, export or delete your data and withdraw marketing consent at any time by writing to privacy@vedrashi.com.'),
    ],
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    subtitle: 'Please read these terms carefully before using VedRashi',
    published: true,
    updatedAt: '2026-06-01T10:00:00',
    updatedBy: 'Legal Team',
    sections: [
      s('t1', 'Acceptance of Terms', 'By using VedRashi you confirm you are at least 18 years old and agree to these terms.'),
      s('t2', 'Description of Services', 'VedRashi is a marketplace connecting users with verified astrologers, pandits and spiritual sellers via chat, call, video, bookings and the AstroVati store.'),
      s('t3', 'User Accounts', 'You are responsible for your credentials and all activity under your account. We may suspend accounts that violate these terms.'),
      s('t4', 'Consultations', 'Consultations are for guidance and spiritual purposes only and do not constitute medical, legal or financial advice.'),
      s('t5', 'Payment Terms', 'Consultations are charged per minute from your wallet. Prices include applicable GST unless stated. All transactions are in INR.'),
      s('t6', 'Prohibited Activities', 'No harassment, off-platform payments, false information, scraping or unauthorised access.'),
      s('t7', 'Governing Law', 'These terms are governed by the laws of India with exclusive jurisdiction of courts in New Delhi.'),
    ],
  },
  {
    id: 'refund',
    title: 'Refund Policy',
    subtitle: 'Our fair and transparent refund guidelines',
    published: true,
    updatedAt: '2026-06-01T10:00:00',
    updatedBy: 'Legal Team',
    sections: [
      s('r1', 'Overview', 'We want every experience to be meaningful. Where something goes wrong on our side, we make it right.'),
      s('r2', 'Eligible Refunds', 'Technical failure on our side: 100% within 3–5 business days. Astrologer no-show: 100% + ₹50 platform credit. Severely disrupted sessions: prorated. Duplicate payments: 100%.'),
      s('r3', 'Not Eligible', 'Dissatisfaction with predictions, voluntary disconnection (unused minutes refunded), requests after 7 days, opened or used products.'),
      s('r4', 'Product Returns', 'Sealed products can be returned within 7 days. Defective items are replaced free of charge.'),
      s('r5', 'How Refunds Are Paid', 'Refunds go to your VedRashi wallet instantly or to the original payment method in 5–7 business days.'),
    ],
  },
  {
    id: 'cancellation',
    title: 'Cancellation Policy',
    subtitle: 'Guidelines for cancelling consultations and bookings',
    published: true,
    updatedAt: '2026-06-01T10:00:00',
    updatedBy: 'Legal Team',
    sections: [
      s('c1', 'Consultation Cancellations', 'More than 30 min before: 100% refund. 15–30 min: 75% refund + 10% bonus credit. Less than 15 min: 50% refund. No-show: no refund.'),
      s('c2', 'Pandit Booking Cancellations', 'More than 72 hours before: 100%. 24–72 hours: 70%. Less than 24 hours: 50%. Same day or no-show: no refund.'),
      s('c3', 'Rescheduling', 'Pandit bookings can be rescheduled free up to 48 hours before the ceremony.'),
      s('c4', 'Product Order Cancellations', 'Orders can be cancelled within 2 hours of placement if not dispatched, for a full refund.'),
    ],
  },
  {
    id: 'cookie',
    title: 'Cookie Policy',
    subtitle: 'How and why VedRashi uses cookies',
    published: true,
    updatedAt: '2026-06-01T10:00:00',
    updatedBy: 'Legal Team',
    sections: [
      s('k1', 'Essential Cookies', 'Required for login sessions, cart and security (session_id, auth_token, csrf_token). Cannot be disabled.'),
      s('k2', 'Analytics Cookies', 'Help us understand usage (_ga, amplitude_session). Up to 2 years. Optional.'),
      s('k3', 'Functional Cookies', 'Remember preferences like language and saved Rashi. Up to 1 year. Optional.'),
      s('k4', 'Marketing Cookies', 'Deliver relevant ads (_fbp, google_ads_id). Up to 90 days. Optional.'),
      s('k5', 'Managing Cookies', 'Use our cookie banner or browser settings to accept, reject or customise cookies.'),
    ],
  },
  {
    id: 'community',
    title: 'Community Guidelines',
    subtitle: 'Keeping VedRashi respectful for users and experts',
    published: false,
    updatedAt: '2026-09-22T16:40:00',
    updatedBy: 'Trust & Safety',
    sections: [
      s('g1', 'Be Respectful', 'Abusive, sexual or threatening language towards astrologers, pandits or other users leads to immediate suspension.'),
      s('g2', 'No Off-Platform Dealings', 'Do not share phone numbers or ask for payments outside VedRashi. This protects both users and experts.'),
      s('g3', 'Honest Reviews', 'Reviews must reflect genuine experiences. Paid or fake reviews are removed.'),
      s('g4', 'No Fear-Based Selling', 'Experts must not pressure users into expensive remedies using fear or guarantees.'),
      s('g5', 'Reporting', 'Use Help & Support → Raise an issue to report violations. We respond within 24 hours.'),
    ],
  },
]
export const legalPagesDb = createLegalPagesDb(() => legalSeed)

// ---------- FAQs ----------

export const FAQ_GROUPS: FaqGroup[] = ['Account & Wallet', 'Consultations', 'Puja Booking', 'Product Orders', 'Website · Home', 'Website · Contact']

// ---------- Website content ----------

export const homeStatsDb = createHomeStatsDb(() => [
  { id: 'HS1', label: 'Happy Users', value: '50,000+', order: 1 },
  { id: 'HS2', label: 'Verified Astrologers', value: '500+', order: 2 },
  { id: 'HS3', label: 'Pandit Partners', value: '100+', order: 3 },
  { id: 'HS4', label: 'Average Rating', value: '4.9/5', order: 4 },
  { id: 'HS5', label: 'Cities Served', value: '150+', order: 5 },
  { id: 'HS6', label: 'Consultations Done', value: '1M+', order: 6 },
])

export const timelineDb = createTimelineDb(() => [
  { id: 'TL1', year: '2019', text: 'VedRashi founded in Bengaluru by Arjun Verma with 10 astrologers on the platform.' },
  { id: 'TL2', year: '2020', text: 'Expanded to 100+ astrologers. Launched free Kundli generation, used by 1 lakh users in year one.' },
  { id: 'TL3', year: '2021', text: 'Introduced Book Pandit service. Crossed 10,000 active users and ₹1 Cr in annual GMV.' },
  { id: 'TL4', year: '2022', text: 'Raised Series A funding. Expanded Pandit network to 50+ cities across India.' },
  { id: 'TL5', year: '2023', text: 'Launched Spiritual Store and mobile app. Crossed 25,000 monthly active users.' },
  { id: 'TL6', year: '2024', text: 'Hit 50,000 users and 500+ astrologers. India’s most-reviewed astrology platform on Play Store.' },
  { id: 'TL7', year: '2026', text: 'Launching AI-powered Kundli insights, live astrology shows and international expansion.' },
])

export const teamDb = createTeamDb(() => [
  { id: 'TM1', name: 'Arjun Verma', role: 'Founder & CEO', bio: '20+ years in Vedic tradition. IIT alumnus turned spiritual entrepreneur.', photoUrl: 'https://i.pravatar.cc/240?img=12', order: 1, active: true },
  { id: 'TM2', name: 'Priya Nair', role: 'Head of Astrology', bio: 'PhD in Sanskrit & Jyotish. Author of 3 books on Vedic astrology.', photoUrl: 'https://i.pravatar.cc/240?img=47', order: 2, active: true },
  { id: 'TM3', name: 'Vikram Singh', role: 'CTO', bio: 'Former Google engineer. Building technology that serves dharma.', photoUrl: 'https://i.pravatar.cc/240?img=33', order: 3, active: true },
  { id: 'TM4', name: 'Kavya Menon', role: 'Head of Pandit Network', bio: '15 years of experience in temple administration and Vedic rituals.', photoUrl: 'https://i.pravatar.cc/240?img=45', order: 4, active: true },
  { id: 'TM5', name: 'Rohan Desai', role: 'Head of Growth', bio: 'Scaled consumer apps to millions of users across Bharat.', photoUrl: 'https://i.pravatar.cc/240?img=15', order: 5, active: false },
])

const plan = (id: string, name: string, price: string, text: string, popular = false) => ({ id, name, price, text, popular })
const qa = (id: string, q: string, a: string) => ({ id, q, a })

export const servicePagesDb = createServicePagesDb(() => [
  {
    id: 'talk-to-astrologer',
    title: 'Talk to Astrologer',
    tagline: 'Instant guidance from verified Vedic astrologers',
    updatedAt: '2026-08-12T11:00:00',
    plans: [plan('a1', 'Starter', '₹10/min', 'New astrologers building reviews. Great for basic queries.'), plan('a2', 'Expert', '₹15–25/min', 'Verified experts with 5+ years and 1000+ reviews.', true), plan('a3', 'Senior', '₹30–50/min', 'Master astrologers with 15+ years and 5000+ reviews.')],
    faqs: [
      qa('af1', 'What information do I need for a consultation?', 'Keep your date, exact time and place of birth handy.'),
      qa('af2', 'How do I know if an astrologer is genuine?', 'Every astrologer clears a 3-round vetting with test consultations and background checks.'),
      qa('af3', "What if I'm not satisfied?", 'Reach out to support within 24 hours. We offer a wallet refund where the consultation did not meet our standards.'),
    ],
  },
  {
    id: 'book-pandit',
    title: 'Book Pandit',
    tagline: 'Verified pandits for every ceremony, at your home',
    updatedAt: '2026-08-12T11:00:00',
    plans: [plan('b1', 'Small Puja', 'From ₹500', 'Simple pujas like Ganesh Puja, Lakshmi Puja, daily rituals.'), plan('b2', 'Major Ceremony', '₹1,100–₹2,500', 'Grih Pravesh, Satyanarayan, Havan, Rudrabhishek.', true), plan('b3', 'Wedding Package', '₹5,000+', 'Full wedding ceremonies including multi-day rituals.')],
    faqs: [
      qa('bf1', 'What ceremonies can I book?', '50+ ceremonies including Grih Pravesh, Vivah, Satyanarayan Katha, Rudrabhishek, Havan, Namkaran and Mundan.'),
      qa('bf2', 'Do pandits bring their own puja materials?', 'Yes — choose the Samagri option while booking.'),
      qa('bf3', 'How far in advance should I book?', 'At least 3–5 days ahead, and 2–4 weeks for weddings or festival dates.'),
    ],
  },
  {
    id: 'e-puja',
    title: 'E-Puja',
    tagline: 'Sacred rituals performed live from temples, wherever you are',
    updatedAt: '2026-07-30T15:20:00',
    plans: [plan('e1', 'Single Puja', '₹501', 'One puja performed in your name with sankalp.'), plan('e2', 'Festival Special', '₹1,100', 'Puja + live stream + prasad delivered home.', true), plan('e3', 'Monthly Seva', '₹2,100/mo', 'Recurring puja every month on your chosen tithi.')],
    faqs: [
      qa('ef1', 'Can I watch the puja live?', 'Yes, every e-puja is streamed live in the VedRashi app.'),
      qa('ef2', 'Will I receive prasad?', 'Festival Special and Monthly Seva include prasad delivery across India.'),
    ],
  },
  {
    id: 'spiritual-products',
    title: 'Spiritual Products',
    tagline: 'Certified gemstones, Rudraksha and puja essentials',
    updatedAt: '2026-09-02T10:10:00',
    plans: [plan('s1', 'Spiritual Essentials', '₹99–₹999', 'Puja kits, incense, diyas, small yantras, and books.'), plan('s2', 'Rudraksha & Crystals', '₹299–₹3,999', 'Authentic Rudraksha malas and healing stones.', true), plan('s3', 'Certified Gemstones', '₹1,999–₹50,000+', 'GIA-certified precious stones for astrological benefits.')],
    faqs: [
      qa('sf1', 'How do I know if a Rudraksha is genuine?', 'Every Rudraksha ships with an origin certificate from an accredited lab.'),
      qa('sf2', 'Are the yantras energized?', 'Yes, through prana pratishtha by qualified pandits before dispatch.'),
      qa('sf3', 'Do you ship internationally?', 'We deliver across India with free shipping above ₹999. International shipping on request.'),
    ],
  },
])

// ---------- Testimonials ----------

export const SURFACES: { value: TestimonialSurface; label: string }[] = [
  { value: 'app', label: 'App home' },
  { value: 'store', label: 'Store' },
  { value: 'website', label: 'Website' },
]

