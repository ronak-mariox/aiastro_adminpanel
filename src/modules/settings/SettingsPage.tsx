import { useState } from 'react'
import { PageHeader, Tabs } from '@/components/ui'
import { useRecord } from '@/lib/store'
import CatalogTab from './CatalogTab'
import { appSettingsDb } from './data'
import GeneralTab from './GeneralTab'
import IntegrationsTab from './IntegrationsTab'
import PlatformTab from './PlatformTab'
import RulesTab from './RulesTab'

type Tab = 'general' | 'platform' | 'catalog' | 'rules' | 'integrations'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const { record } = useRecord(appSettingsDb, 'app')

  return (
    <div>
      <PageHeader title="Settings" subtitle="Platform-wide configuration for UserApp, astroApp and vedrashi.com" />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'general', label: 'General' },
          { key: 'platform', label: 'Billing & features' },
          { key: 'catalog', label: 'Catalog lists' },
          { key: 'rules', label: 'Consultation rules' },
          { key: 'integrations', label: 'Integrations' },
        ]}
      />
      {tab === 'general' && record && <GeneralTab key={record.supportEmail + record.maintenanceMode} settings={record} />}
      {tab === 'platform' && record && <PlatformTab key={JSON.stringify(record.platform)} settings={record} />}
      {tab === 'catalog' && <CatalogTab />}
      {tab === 'rules' && record && <RulesTab settings={record} />}
      {tab === 'integrations' && <IntegrationsTab />}
    </div>
  )
}
