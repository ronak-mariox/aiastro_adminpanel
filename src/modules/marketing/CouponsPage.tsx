import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, PageHeader, Tabs } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { CouponsTab } from './CouponsTab'
import { ReferralTab } from './ReferralTab'
import { RewardRulesTab } from './RewardRulesTab'
import { couponsDb } from './data'

type TabKey = 'coupons' | 'rewards' | 'referral'

export default function CouponsPage() {
  const [tab, setTab] = useState<TabKey>('coupons')
  const [formOpen, setFormOpen] = useState(false)
  const { items } = useCollection(couponsDb)

  return (
    <>
      <PageHeader
        title="Coupons & Rewards"
        subtitle="Discount codes, loyalty points and the referral program across UserApp & website"
        actions={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => {
              setTab('coupons')
              setFormOpen(true)
            }}>
            New coupon
          </Button>
        }
      />
      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'coupons', label: 'Coupons', count: items.length },
          { key: 'rewards', label: 'Reward rules' },
          { key: 'referral', label: 'Referral program' },
        ]}
      />
      {tab === 'coupons' && <CouponsTab formOpen={formOpen} setFormOpen={setFormOpen} />}
      {tab === 'rewards' && <RewardRulesTab />}
      {tab === 'referral' && <ReferralTab />}
    </>
  )
}
