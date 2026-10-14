import { useCallback } from 'react'
import { Gift, Percent, Truck, Wallet } from 'lucide-react'
import { Card, EmptyState, PageHeader, StatCard, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { useCollection, useRecord } from '@/lib/store'
import { formatDateTime, formatINR } from '@/lib/utils'
import { FINANCE_CONFIG_ID, financeConfigDb, rechargePacksDb } from './data'
import { FirstSessionCard, NumberGroupCard, PayoutSettingsCard, WalletCard, type SaveFn } from './PricingSections'
import { RechargePacksCard } from './RechargePacksCard'

export default function PricingPage() {
  const { record: config, update, loading, error } = useRecord(financeConfigDb, FINANCE_CONFIG_ID)
  const { items: packs } = useCollection(rechargePacksDb)
  const toast = useToast()

  const save = useCallback<SaveFn>(
    async (patch, label) => {
      try {
        await update(FINANCE_CONFIG_ID, patch)
        toast(`${label} saved`)
      } catch (e) {
        toast(`Could not save ${label.toLowerCase()}: ${errorMessage(e)}`, 'error')
      }
    },
    [update, toast],
  )

  if (!config)
    return (
      <Card>
        <EmptyState
          icon={Percent}
          title={loading ? 'Loading pricing…' : 'Pricing config not found'}
          text={!loading && error ? errorMessage(error) : undefined}
        />
      </Card>
    )

  const c = config.commission
  const avgCommission = Math.round((c.chat + c.call + c.video + c.puja) / 4)
  const samplePuja = 2100
  const pujaSubtotal = samplePuja + config.pujaFees.materials + config.pujaFees.travel
  const pujaTotal = Math.round(pujaSubtotal * (1 + config.gst.puja / 100))

  return (
    <>
      <PageHeader
        title="Pricing & Fees"
        subtitle={`Platform commission, taxes, wallet and shipping rules · last updated ${formatDateTime(config.updatedAt)}`}
        breadcrumbs={[{ label: 'Finance' }, { label: 'Pricing & Fees' }]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Avg service commission" value={`${avgCommission}%`} icon={Percent} hint="Chat, call, video & puja" />
        <StatCard label="Active recharge packs" value={packs.filter(p => p.active).length} icon={Wallet} tone="gold" hint={`Min recharge ${formatINR(config.minRecharge)}`} />
        <StatCard
          label="First session"
          value={config.freeFirstSession ? `${config.firstSessionMinutes} min free` : 'Off'}
          icon={Gift}
          tone="purple"
          hint={`then ${formatINR(config.firstConsultationPrice)}/min`}
        />
        <StatCard label="Free shipping above" value={formatINR(config.shipping.freeAbove)} icon={Truck} tone="green" hint={`${config.shipping.returnDays}-day returns`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <NumberGroupCard
         
          title="Platform commission"
          subtitle="Share of each transaction retained by VedRashi"
          values={config.commission}
          fields={[
            { key: 'chat', label: 'Chat', unit: '%', hint: '% · platform default (billing)' },
            { key: 'call', label: 'Call', unit: '%' },
            { key: 'video', label: 'Video', unit: '%' },
            { key: 'puja', label: 'Puja booking', unit: '%' },
            { key: 'store', label: 'Store (partner listings)', unit: '%' },
          ]}
          onSave={v => save({ commission: v }, 'Commission rates')}
          footer={
            <>
              Example: a ₹30/min chat → astrologer earns {formatINR(30 * (1 - c.chat / 100))}/min, platform keeps {formatINR((30 * c.chat) / 100)}/min.
            </>
          }
        />

        <NumberGroupCard
         
          title="GST rates"
          subtitle="Applied at checkout in the UserApp"
          values={config.gst}
          fields={[
            { key: 'recharge', label: 'Wallet recharge', unit: '%', max: 28 },
            { key: 'puja', label: 'Puja booking', unit: '%', max: 28 },
            { key: 'store', label: 'Store products', unit: '%', max: 28 },
          ]}
          onSave={v => save({ gst: v }, 'GST rates')}
          footer={<>A ₹500 recharge is charged {formatINR(500 * (1 + config.gst.recharge / 100))} including GST.</>}
        />

        <NumberGroupCard
         
          title="Puja fixed fees"
          subtitle="Added on top of the pandit's base fee"
          values={config.pujaFees}
          fields={[
            { key: 'materials', label: 'Puja materials (samagri)', unit: '₹' },
            { key: 'travel', label: 'Pandit travel', unit: '₹' },
          ]}
          onSave={v => save({ pujaFees: v }, 'Puja fees')}
          footer={
            <>
              Preview: base {formatINR(samplePuja)} + materials {formatINR(config.pujaFees.materials)} + travel {formatINR(config.pujaFees.travel)} + GST{' '}
              {config.gst.puja}% = <span className="font-semibold text-ink">{formatINR(pujaTotal)}</span>
            </>
          }
        />

        <NumberGroupCard
         
          title="Shipping & returns"
          subtitle="AstroVati store order rules"
          values={config.shipping}
          fields={[
            { key: 'freeAbove', label: 'Free shipping above', unit: '₹' },
            { key: 'flatFee', label: 'Shipping fee below threshold', unit: '₹' },
            { key: 'codFee', label: 'COD handling fee', unit: '₹' },
            { key: 'returnDays', label: 'Return window', unit: 'days', min: 0, max: 30 },
          ]}
          onSave={v => save({ shipping: v }, 'Shipping rules')}
        />

        <WalletCard config={config} save={save} />
        <PayoutSettingsCard config={config} save={save} />
        <FirstSessionCard config={config} save={save} />
        <div className="xl:col-span-2">
          <RechargePacksCard />
        </div>
      </div>
    </>
  )
}
