import { useEffect, useMemo, useState } from 'react'
import { Download, Mail, MessageSquareText, Smartphone, TrendingUp } from 'lucide-react'
import { Button, PageHeader, StatCard, Tabs, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCollection } from '@/lib/store'
import { downloadCsv } from './csv'
import { appLeadsDb, inquiriesDb, subscribersDb } from './data'
import { AppLeadsTable, InquiriesTable, SubscribersTable } from './LeadTables'

type Tab = 'inquiries' | 'app' | 'newsletter'

export default function LeadsPage() {
  const [tab, setTab] = useState<Tab>('inquiries')
  const inquiries = useCollection(inquiriesDb)
  const appLeads = useCollection(appLeadsDb)
  const subscribers = useCollection(subscribersDb)
  const toast = useToast()
  const loadError = inquiries.error ?? appLeads.error ?? subscribers.error
  useEffect(() => {
    if (loadError) toast(errorMessage(loadError), 'error')
  }, [loadError, toast])

  const stats = useMemo(() => {
    const inq = inquiries.items
    const converted = inq.filter(i => i.status === 'converted').length
    const verified = appLeads.items.filter(l => l.otpVerified).length
    return {
      newInquiries: inq.filter(i => i.status === 'new').length,
      conversion: inq.length ? Math.round((converted / inq.length) * 100) : 0,
      converted,
      appLeads: appLeads.items.length,
      verifiedPct: appLeads.items.length ? Math.round((verified / appLeads.items.length) * 100) : 0,
      activeSubs: subscribers.items.filter(s => s.active).length,
    }
  }, [inquiries.items, appLeads.items, subscribers.items])

  const exportTab = () => {
    if (tab === 'inquiries')
      downloadCsv(
        'website-inquiries',
        inquiries.items.map(i => ({ id: i.reference, name: i.name, phone: i.phone, email: i.email, service: i.service, message: i.message, status: i.status, notes: i.notes, createdAt: i.createdAt })),
      )
    else if (tab === 'app')
      downloadCsv(
        'app-download-leads',
        appLeads.items.map(l => ({ id: l.reference, phone: l.phone, sourcePage: l.sourcePage, otpVerified: l.otpVerified, status: l.status, notes: l.notes, createdAt: l.createdAt })),
      )
    else downloadCsv('newsletter-subscribers', subscribers.items.map(s => ({ email: s.email, subscribedAt: s.subscribedAt, active: s.active })))
  }

  return (
    <div>
      <PageHeader
        title="Leads & Inquiries"
        subtitle="Contact form submissions, app-download leads and newsletter subscribers from vedrashi.com"
        actions={
          <Button icon={<Download className="size-4" />} onClick={exportTab}>
            Export CSV
          </Button>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New inquiries" value={stats.newInquiries} icon={MessageSquareText} hint="Awaiting first contact" />
        <StatCard label="Inquiry conversion" value={`${stats.conversion}%`} icon={TrendingUp} tone="green" hint={`${stats.converted} converted`} />
        <StatCard label="App-download leads" value={stats.appLeads} icon={Smartphone} tone="blue" hint={`${stats.verifiedPct}% OTP verified`} />
        <StatCard label="Active subscribers" value={stats.activeSubs} icon={Mail} tone="gold" hint={`of ${subscribers.items.length} total`} />
      </div>
      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'inquiries', label: 'Contact inquiries', count: inquiries.items.length },
          { key: 'app', label: 'App-download leads', count: appLeads.items.length },
          { key: 'newsletter', label: 'Newsletter', count: subscribers.items.length },
        ]}
      />
      {tab === 'inquiries' && <InquiriesTable rows={inquiries.items} loading={inquiries.loading} />}
      {tab === 'app' && <AppLeadsTable rows={appLeads.items} loading={appLeads.loading} />}
      {tab === 'newsletter' && <SubscribersTable rows={subscribers.items} loading={subscribers.loading} />}
    </div>
  )
}
