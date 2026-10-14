import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, Textarea, Toggle, useConfirm, useToast } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { appSettingsDb, logAudit } from './data'
import type { AppSettings, ForceUpdate } from './types'

const VERSION = /^\d+\.\d+\.\d+$/
const URL_RE = /^https:\/\/\S+$/

function validate(f: AppSettings) {
  const e: Record<string, string> = {}
  if (!f.appName.trim()) e.appName = 'Required'
  if (f.supportPhone.trim() && !/^\+91[\d\s]{10,13}$/.test(f.supportPhone.trim())) e.supportPhone = 'Use +91 followed by 10 digits'
  if (!/^\S+@\S+\.\S+$/.test(f.supportEmail.trim())) e.supportEmail = 'Enter a valid email'
  if (f.whatsapp && !/^\+91[\d\s]{10,13}$/.test(f.whatsapp.trim())) e.whatsapp = 'Use +91 followed by 10 digits'
  if (!f.officeAddress.trim()) e.officeAddress = 'Required'
  ;(['playStoreUrl', 'appStoreUrl'] as const).forEach(k => {
    if (f[k] && !URL_RE.test(f[k])) e[k] = 'Must start with https://'
  })
  Object.entries(f.social).forEach(([k, v]) => {
    if (v && !URL_RE.test(v)) e[`social.${k}`] = 'Must start with https://'
  })
  ;(['userApp', 'astroApp'] as const).forEach(app => {
    const u = f.forceUpdate[app]
    if (!VERSION.test(u.minVersion)) e[`${app}.min`] = 'Format x.y.z'
    if (!VERSION.test(u.latestVersion)) e[`${app}.latest`] = 'Format x.y.z'
  })
  return e
}

export default function GeneralTab({ settings }: { settings: AppSettings }) {
  const toast = useToast()
  const confirm = useConfirm()
  const { admin } = useAuth()
  const [form, setForm] = useState(settings)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(settings)

  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setForm(f => ({ ...f, [k]: v }))
  const setSocial = (k: keyof AppSettings['social'], v: string) => setForm(f => ({ ...f, social: { ...f.social, [k]: v } }))
  const setUpdate = (app: 'userApp' | 'astroApp', patch: Partial<ForceUpdate>) =>
    setForm(f => ({ ...f, forceUpdate: { ...f.forceUpdate, [app]: { ...f.forceUpdate[app], ...patch } } }))

  const save = async () => {
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length) {
      toast('Fix the highlighted fields', 'error')
      return
    }
    if (form.maintenanceMode && !settings.maintenanceMode) {
      const ok = await confirm({
        title: 'Turn on maintenance mode?',
        message: 'Customers and partners will see the maintenance screen in all apps and the website until it is turned off.',
        confirmLabel: 'Enable maintenance',
        tone: 'danger',
      })
      if (ok === false) return
    }
    setSaving(true)
    try {
      const { platform: _platform, rules: _rules, ...general } = form
      void _platform
      void _rules
      await appSettingsDb.update('app', general)
      logAudit(admin, 'Settings', 'Updated general settings', form.maintenanceMode !== settings.maintenanceMode ? `Maintenance mode ${form.maintenanceMode ? 'ON' : 'OFF'}` : 'App & contact details')
      toast('Settings saved')
    } catch {
      /* error toast comes from the API layer */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {form.maintenanceMode && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="size-5 shrink-0" /> Maintenance mode is {settings.maintenanceMode ? 'ON — apps are showing the maintenance screen.' : 'about to be turned on.'}
        </div>
      )}

      <Card>
        <CardHeader title="App & contact" subtitle="Shown in the apps' help section and on the website footer / contact page" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input label="App name" value={form.appName} error={errors.appName} onChange={e => set('appName', e.target.value)} />
          <Input label="Working hours" value={form.workingHours} onChange={e => set('workingHours', e.target.value)} />
          <Input label="Support phone" value={form.supportPhone} error={errors.supportPhone} onChange={e => set('supportPhone', e.target.value)} />
          <Input label="Support email" type="email" value={form.supportEmail} error={errors.supportEmail} onChange={e => set('supportEmail', e.target.value)} />
          <Input label="WhatsApp number" value={form.whatsapp} error={errors.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          <div className="sm:col-span-2">
            <Textarea label="Office address" rows={2} value={form.officeAddress} error={errors.officeAddress} onChange={e => set('officeAddress', e.target.value)} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Social & store links" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(form.social) as (keyof AppSettings['social'])[]).map(k => (
            <Input key={k} label={k === 'twitter' ? 'X (Twitter)' : k.charAt(0).toUpperCase() + k.slice(1)} value={form.social[k]} error={errors[`social.${k}`]} onChange={e => setSocial(k, e.target.value)} />
          ))}
          <Input label="Google Play URL" value={form.playStoreUrl} error={errors.playStoreUrl} onChange={e => set('playStoreUrl', e.target.value)} />
          <Input label="App Store URL" value={form.appStoreUrl} error={errors.appStoreUrl} onChange={e => set('appStoreUrl', e.target.value)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Maintenance & app versions" subtitle="Maintenance mode makes the API refuse the apps (except /settings). Versions are what the apps check themselves against; the UserApp minimum is the API's minimum supported version." />
        <CardBody className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
            <Toggle checked={form.maintenanceMode} onChange={v => set('maintenanceMode', v)} label="Maintenance mode" />
            <Textarea label="Maintenance message" rows={2} value={form.maintenanceMessage} onChange={e => set('maintenanceMessage', e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {(['userApp', 'astroApp'] as const).map(app => (
              <div key={app} className="space-y-3 rounded-xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{app === 'userApp' ? 'UserApp (customers)' : 'astroApp (astrologers & pandits)'}</p>
                  <Toggle checked={form.forceUpdate[app].enforce} onChange={v => setUpdate(app, { enforce: v })} label="Force" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Minimum version" value={form.forceUpdate[app].minVersion} error={errors[`${app}.min`]} onChange={e => setUpdate(app, { minVersion: e.target.value })} />
                  <Input label="Latest version" value={form.forceUpdate[app].latestVersion} error={errors[`${app}.latest`]} onChange={e => setUpdate(app, { latestVersion: e.target.value })} />
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <SaveBar dirty={dirty} saving={saving} onReset={() => { setForm(settings); setErrors({}) }} onSave={save} />
    </div>
  )
}

export function SaveBar({ dirty, saving, onReset, onSave }: { dirty: boolean; saving: boolean; onReset: () => void; onSave: () => void }) {
  return (
    <div className="sticky bottom-4 z-10 flex items-center justify-end gap-2 rounded-2xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
      <span className="mr-auto pl-2 text-sm text-muted">{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
      <Button variant="outline" disabled={!dirty} onClick={onReset}>
        Reset
      </Button>
      <Button loading={saving} disabled={!dirty} onClick={onSave}>
        Save changes
      </Button>
    </div>
  )
}
