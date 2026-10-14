import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, ExternalLink, FileText, HelpCircle, Users } from 'lucide-react'
import { Button, PageHeader, StatCard, Tabs } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatDate } from '@/lib/utils'
import { FaqsTab } from './FaqsTab'
import { LegalTab } from './LegalTab'
import { WebsiteTab } from './WebsiteTab'
import { faqsDb, legalPagesDb, servicePagesDb, teamDb } from './data'

type TabKey = 'legal' | 'faqs' | 'website'

export default function PagesPage() {
  const [tab, setTab] = useState<TabKey>('legal')
  const navigate = useNavigate()
  const { items: legal } = useCollection(legalPagesDb)
  const { items: faqs } = useCollection(faqsDb)
  const { items: team } = useCollection(teamDb)
  const { items: services } = useCollection(servicePagesDb)
  const lastLegal = legal.reduce((m, p) => (p.updatedAt > m ? p.updatedAt : m), '')

  return (
    <>
      <PageHeader
        title="Pages & FAQs"
        subtitle="Legal pages, help FAQs and static website content"
        actions={
          <>
            <Button variant="outline" icon={<ExternalLink className="size-4" />} onClick={() => window.open('https://vedrashi.com', '_blank', 'noopener')}>
              View site
            </Button>
            <Button onClick={() => navigate('/blogs/new')}>Write blog post</Button>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Legal pages" value={`${legal.filter(p => p.published).length}/${legal.length}`} icon={FileText} hint={lastLegal ? `last edit ${formatDate(lastLegal)}` : 'published'} />
        <StatCard label="FAQs live" value={faqs.filter(f => f.active).length} icon={HelpCircle} tone="blue" hint={`${faqs.length} total`} />
        <StatCard label="Team members" value={team.filter(m => m.active).length} icon={Users} tone="purple" hint="on About page" />
        <StatCard label="Service pages" value={services.length} icon={Briefcase} tone="gold" hint={`${services.reduce((s, p) => s + p.faqs.length, 0)} FAQs`} />
      </div>
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'legal', label: 'Legal pages', count: legal.length },
          { key: 'faqs', label: 'FAQs', count: faqs.length },
          { key: 'website', label: 'Website content' },
        ]}
      />
      {tab === 'legal' && <LegalTab />}
      {tab === 'faqs' && <FaqsTab />}
      {tab === 'website' && <WebsiteTab />}
    </>
  )
}
