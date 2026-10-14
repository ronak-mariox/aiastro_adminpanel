import { Construction } from 'lucide-react'
import { Card, EmptyState, PageHeader } from '@/components/ui'

export default function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState icon={Construction} title="Being built" text="This section is under construction." />
      </Card>
    </>
  )
}
