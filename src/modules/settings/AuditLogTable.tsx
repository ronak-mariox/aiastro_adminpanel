import { Download } from 'lucide-react'
import { Badge, Button, DataTable, type Column } from '@/components/ui'
import { useCollection } from '@/lib/store'
import { formatDateTime } from '@/lib/utils'
import { downloadCsv } from '../marketing/utils'
import { auditDb } from './data'
import type { AuditEntry } from './types'

export default function AuditLogTable() {
  const { items, loading } = useCollection(auditDb)

  const columns: Column<AuditEntry>[] = [
    { key: 'at', header: 'When', sortValue: a => a.at, render: a => <span className="text-xs whitespace-nowrap text-muted">{formatDateTime(a.at)}</span> },
    {
      key: 'actor',
      header: 'Who',
      sortValue: a => a.actor,
      render: a => (
        <div className="whitespace-nowrap">
          <p className="font-medium">{a.actor}</p>
          <p className="text-xs text-muted">{a.role}</p>
        </div>
      ),
    },
    { key: 'module', header: 'Module', sortValue: a => a.module, render: a => <Badge>{a.module}</Badge> },
    { key: 'action', header: 'Action', render: a => <span className="whitespace-nowrap">{a.action}</span> },
    { key: 'target', header: 'Target', render: a => <span className="text-muted">{a.target}</span> },
    { key: 'ip', header: 'IP', render: a => <code className="text-xs text-muted">{a.ip}</code> },
  ]

  return (
    <DataTable
      rows={items}
      columns={columns}
      rowKey={a => a.id}
      loading={loading}
      pageSize={15}
      searchText={a => `${a.actor} ${a.action} ${a.target} ${a.module}`}
      searchPlaceholder="Search actor, action, target…"
      filters={[
        { key: 'module', label: 'Module', options: [...new Set(items.map(a => a.module))].sort(), match: (a, v) => a.module === v },
        { key: 'actor', label: 'Admin', options: [...new Set(items.map(a => a.actor))].sort(), match: (a, v) => a.actor === v },
      ]}
      toolbar={
        <Button
          variant="outline"
          icon={<Download className="size-4" />}
          onClick={() => downloadCsv('audit-log.csv', items.map(a => ({ at: a.at, actor: a.actor, role: a.role, module: a.module, action: a.action, target: a.target, ip: a.ip })))}>
          Export
        </Button>
      }
    />
  )
}
