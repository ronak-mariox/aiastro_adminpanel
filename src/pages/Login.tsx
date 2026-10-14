import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, Moon, ShieldCheck, Sparkles, Sun } from 'lucide-react'
import emblem from '@/assets/vedrashi-emblem.png'
import { useToast } from '@/components/ui'
import { ApiError, api, errorMessage } from '@/lib/api'
import { useAuth, type LoginChallenge } from '@/lib/auth'
import { cn } from '@/lib/utils'

// Layout & colours follow the deployed console's sign-in screen (celestial left panel + ivory form side).
const LEFT_BG = [
  'radial-gradient(circle at 20% 25%, rgba(200, 16, 46, 0.4) 0%, transparent 50%)',
  'radial-gradient(circle at 80% 75%, rgba(245, 158, 11, 0.35) 0%, transparent 55%)',
  'linear-gradient(165deg, #0D0A1A 0%, #16122C 45%, #24142E 100%)',
].join(',')

const RIGHT_BG = [
  'radial-gradient(circle at 80% 20%, rgba(200, 16, 46, 0.06) 0%, transparent 40%)',
  'radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 40%)',
  '#FAF7F2',
].join(',')

const MOBILE_BG = [
  'radial-gradient(circle at 50% 20%, rgba(200, 16, 46, 0.1) 0%, transparent 60%)',
  'radial-gradient(circle at 80% 80%, rgba(245, 158, 11, 0.12) 0%, transparent 60%)',
].join(',')

// The emblem artwork already carries the "VedRashi" wordmark underneath the zodiac wheel.
function Logo({ className }: { className?: string }) {
  return <img src={emblem} alt="VedRashi" className={cn('object-contain', className)} />
}

type Step = 'credentials' | 'otp' | 'forgot' | 'reset'
type Errors = { email?: string; password?: string; code?: string; newPassword?: string }

const OTP_LEN = 6

/** Six single-digit boxes; paste fills them all. */
function OtpBoxes({ value, onChange, hasError, autoFocus }: { value: string; onChange: (v: string) => void; hasError?: boolean; autoFocus?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])
  const setAt = (i: number, ch: string) => {
    const chars = value.padEnd(OTP_LEN, ' ').split('')
    chars[i] = ch || ' '
    onChange(chars.join('').replace(/\s+$/, ''))
  }
  return (
    <div className="flex justify-between gap-2">
      {Array.from({ length: OTP_LEN }, (_, i) => (
        <input
          key={i}
          ref={el => {
            refs.current[i] = el
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={value[i]?.trim() ?? ''}
          onChange={e => {
            const d = e.target.value.replace(/\D/g, '').slice(-1)
            setAt(i, d)
            if (d && i < OTP_LEN - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !value[i]?.trim() && i > 0) refs.current[i - 1]?.focus()
          }}
          onPaste={e => {
            const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN)
            if (!digits) return
            e.preventDefault()
            onChange(digits)
            refs.current[Math.min(digits.length, OTP_LEN - 1)]?.focus()
          }}
          className={cn(
            'h-[50px] w-full min-w-0 rounded-[10px] border-[1.5px] bg-white text-center text-[1.2rem] font-bold text-ink outline-none transition',
            hasError
              ? 'border-[#EF4444] focus:ring-[3px] focus:ring-[#EF4444]/18'
              : 'border-line hover:border-[#CBD5E1] focus:border-gold-500 focus:ring-[3px] focus:ring-gold-500/18',
          )}
        />
      ))}
    </div>
  )
}

export default function Login() {
  const { admin, login, verifyOtp, resendOtp, expired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const home = from && from !== '/login' ? from : '/'
  const toast = useToast()
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (admin) return <Navigate to={home} replace />

  const go = (next: Step) => {
    setErrors({})
    setCode('')
    setStep(next)
  }

  const validEmail = (): string | undefined => (!email.trim() ? 'Email is required' : !/^\S+@\S+\.\S+$/.test(email.trim()) ? 'Please enter a valid email' : undefined)

  const fail = (err: unknown, field?: keyof Errors) => {
    if (err instanceof ApiError && err.errors.length) {
      const next: Errors = {}
      for (const f of err.errors) {
        const key = (f.field === 'password' && (step === 'reset') ? 'newPassword' : f.field) as keyof Errors
        if (['email', 'password', 'code', 'newPassword'].includes(key)) next[key] = f.message
      }
      if (Object.keys(next).length) {
        setErrors(next)
        return
      }
    }
    if (field && err instanceof ApiError && err.status >= 400 && err.status < 500 && err.code !== 'NETWORK') setErrors({ [field]: err.message })
    else toast(errorMessage(err), 'error')
  }

  const submitCredentials = async () => {
    const e: Errors = { email: validEmail() }
    if (!password) e.password = 'Password is required'
    else if (password.length < 6) e.password = 'Password must be at least 6 characters'
    setErrors(e)
    if (e.email || e.password) return
    try {
      const res = await login(email, password)
      if (res.requiresOtp) {
        setChallenge(res.challenge)
        setCooldown(res.challenge.resendInSeconds ?? 30)
        go('otp')
        if (res.challenge.devCode) toast(`Development code: ${res.challenge.devCode}`, 'info')
      } else {
        toast('Welcome back to VedRashi Admin Portal!')
        navigate(home, { replace: true })
      }
    } catch (err) {
      fail(err, 'password')
    }
  }

  const submitOtp = async () => {
    if (code.length !== OTP_LEN) return setErrors({ code: 'Enter the 6-digit code' })
    try {
      await verifyOtp(challenge?.email ?? email, code)
      toast('Welcome back to VedRashi Admin Portal!')
      navigate(home, { replace: true })
    } catch (err) {
      fail(err, 'code')
    }
  }

  const submitForgot = async () => {
    const e: Errors = { email: validEmail() }
    setErrors(e)
    if (e.email) return
    try {
      const res = await api.post<{ resendInSeconds?: number; devCode?: string; destination?: string }>('/auth/admin/forgot-password', { email: email.trim().toLowerCase() })
      setChallenge({ email: email.trim().toLowerCase(), destination: res.destination, devCode: res.devCode })
      setCooldown(res.resendInSeconds ?? 30)
      go('reset')
      if (res.devCode) toast(`Development code: ${res.devCode}`, 'info')
    } catch (err) {
      fail(err, 'email')
    }
  }

  const submitReset = async () => {
    const e: Errors = {}
    if (code.length !== OTP_LEN) e.code = 'Enter the 6-digit code'
    if (newPassword.length < 6) e.newPassword = 'Password must be at least 6 characters'
    setErrors(e)
    if (e.code || e.newPassword) return
    try {
      await api.post('/auth/admin/reset-password', { email: email.trim().toLowerCase(), code, password: newPassword })
      toast('Password updated. Sign in with your new password.')
      setPassword('')
      setNewPassword('')
      go('credentials')
    } catch (err) {
      fail(err, 'code')
    }
  }

  const resend = async () => {
    if (cooldown > 0) return
    try {
      if (step === 'otp') {
        const res = await resendOtp(challenge?.email ?? email)
        setChallenge(c => ({ ...c, ...res }))
        setCooldown(res.resendInSeconds || 30)
        toast(res.devCode ? `Code sent again. Development code: ${res.devCode}` : 'A new code is on its way.', 'info')
      } else {
        const res = await api.post<{ resendInSeconds?: number; devCode?: string }>('/auth/admin/forgot-password/resend', { email: email.trim().toLowerCase() })
        setCooldown(res.resendInSeconds || 30)
        toast(res.devCode ? `Code sent again. Development code: ${res.devCode}` : 'A new code is on its way.', 'info')
      }
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    setLoading(true)
    try {
      if (step === 'credentials') await submitCredentials()
      else if (step === 'otp') await submitOtp()
      else if (step === 'forgot') await submitForgot()
      else await submitReset()
    } finally {
      setLoading(false)
    }
  }

  const inputWrap = (hasError?: boolean) =>
    cn(
      'flex h-[46px] items-center gap-2.5 rounded-[10px] border-[1.5px] bg-white px-3.5 transition',
      hasError
        ? 'border-[#EF4444] focus-within:ring-[3px] focus-within:ring-[#EF4444]/18'
        : 'border-line hover:border-[#CBD5E1] focus-within:border-gold-500 focus-within:ring-[3px] focus-within:ring-gold-500/18',
    )

  const fieldError = (msg?: string) => (msg ? <p className="mt-1 ml-0.5 text-[0.74rem] font-medium text-[#EF4444]">{msg}</p> : null)

  const HEAD: Record<Step, { badge: string; title: string; sub: string; cta: string; busy: string }> = {
    credentials: {
      badge: 'VedRashi Administrator',
      title: 'Sign In to Portal',
      sub: 'Enter your admin credentials to access the console.',
      cta: 'Log In to Dashboard',
      busy: 'Authenticating...',
    },
    otp: {
      badge: 'Two-step verification',
      title: 'Verify it’s you',
      sub: `Enter the 6-digit code sent to ${challenge?.destination ?? 'your email'}.`,
      cta: 'Verify & Continue',
      busy: 'Verifying...',
    },
    forgot: {
      badge: 'Account recovery',
      title: 'Reset your password',
      sub: 'Enter your admin email and we’ll send you a reset code.',
      cta: 'Send Reset Code',
      busy: 'Sending...',
    },
    reset: {
      badge: 'Account recovery',
      title: 'Choose a new password',
      sub: `Enter the code sent to ${challenge?.destination ?? 'your email'} and your new password.`,
      cta: 'Update Password',
      busy: 'Updating...',
    },
  }
  const head = HEAD[step]

  const emailField = (
    <div className="mb-4">
      <label htmlFor="email" className="mb-1 block text-[0.8rem] font-semibold text-ink">
        Email Address
      </label>
      <div className={inputWrap(!!errors.email)}>
        <Mail className={cn('size-[18px] shrink-0', errors.email ? 'text-[#EF4444]' : 'text-muted')} />
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@shreeastro.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent text-[0.9rem] text-ink outline-none placeholder:text-subtle"
        />
      </div>
      {fieldError(errors.email)}
    </div>
  )

  const resendRow = (
    <div className="mt-2 flex items-center justify-between text-[0.78rem]">
      <span className="text-muted">Didn’t get the code?</span>
      <button
        type="button"
        onClick={resend}
        disabled={cooldown > 0}
        className="font-semibold text-brand-600 transition enabled:hover:text-brand-800 enabled:hover:underline disabled:text-subtle">
        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
      </button>
    </div>
  )

  return (
    <div className="flex min-h-dvh w-full flex-col overflow-x-hidden bg-canvas lg:h-dvh lg:flex-row lg:overflow-hidden">
      {/* Mobile brand header */}
      <div className="flex flex-col items-center px-4 pt-6 pb-2 text-center lg:hidden" style={{ background: MOBILE_BG }}>
        <Logo className="mb-2 w-[130px] drop-shadow-[0_6px_16px_rgba(0,0,0,0.12)]" />
        <p className="text-[1.1rem] font-bold tracking-[0.02em] text-ink">VedRashi Admin Console</p>
      </div>

      {/* Celestial panel */}
      <div className="relative hidden h-full flex-[0_0_46%] flex-col items-center justify-between overflow-hidden px-12 py-8 text-white lg:flex" style={{ background: LEFT_BG }}>
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[540px] -translate-x-1/2 -translate-y-1/2 xl:size-[620px]">
          <div className="size-full animate-[celestial-spin_60s_linear_infinite] rounded-full border-[1.5px] border-dashed border-gold-500/18" />
        </div>
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 xl:size-[480px]">
          <div className="size-full animate-[celestial-spin_45s_linear_infinite_reverse] rounded-full border border-brand-600/22" />
        </div>

        <div className="z-10 inline-flex items-center gap-2 rounded-full border border-gold-500/28 bg-white/8 px-3.5 py-1 shadow-[0_4px_15px_rgba(0,0,0,0.2)] backdrop-blur-md">
          <Sparkles className="size-3.5 text-gold-400" />
          <span className="text-[0.75rem] font-semibold tracking-[0.04em] text-gold-100 uppercase">VedRashi Celestial Console</span>
        </div>

        <div className="z-10 my-auto flex flex-col items-center gap-4 py-3 text-center">
          <div className="relative flex animate-[subtle-float_4s_ease-in-out_infinite] items-center justify-center">
            <div
              className="absolute size-[250px] animate-pulse rounded-full blur-[20px]"
              style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(200, 16, 46, 0.15) 50%, transparent 70%)' }}
            />
            <Logo className="relative w-[210px] drop-shadow-[0_12px_28px_rgba(0,0,0,0.45)] xl:w-[240px]" />
          </div>
          <div className="max-w-[400px] px-2">
            <h2
              className="mb-2 bg-clip-text text-[1.25rem] font-bold tracking-[0.02em] text-transparent xl:text-[1.4rem]"
              style={{ backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #FEF3C7 50%, #FDE68A 100%)' }}>
              Vedic Wisdom Meets Modern Insights
            </h2>
            <p className="text-[0.85rem] leading-relaxed text-white/72">
              Manage astrology consultations, certified astrologers, planetary kundli reports, and sacred products seamlessly.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <span className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/6 px-3 py-1 text-[0.76rem] text-[#E2E8F0]">
              <Sun className="size-3 text-gold-500" />
              Kundli &amp; Predictions
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/6 px-3 py-1 text-[0.76rem] text-[#E2E8F0]">
              <Moon className="size-3 text-gold-200" />
              Astrologer Network
            </span>
          </div>
        </div>
        <span />
      </div>

      {/* Form side */}
      <div className="relative flex flex-1 items-center justify-center p-5 sm:p-8 lg:h-full lg:p-10" style={{ background: RIGHT_BG }}>
        <form
          onSubmit={submit}
          noValidate
          className="w-full rounded-[18px] border border-line/85 bg-white p-6 shadow-[0_12px_30px_-5px_rgba(200,16,46,0.07),0_20px_40px_-10px_rgba(245,158,11,0.1)] sm:max-w-[400px] sm:p-7 md:max-w-[430px] lg:p-8">
          {step !== 'credentials' && (
            <button
              type="button"
              onClick={() => go('credentials')}
              className="mb-3 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-muted transition hover:text-ink">
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </button>
          )}
          <div className="mb-5">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold-500/25 bg-gold-500/12 px-2.5 py-1">
              {step === 'otp' ? <ShieldCheck className="size-3 text-gold-600" /> : step === 'credentials' ? <Sparkles className="size-3 text-gold-600" /> : <KeyRound className="size-3 text-gold-600" />}
              <span className="text-[0.7rem] font-bold tracking-[0.05em] text-gold-700 uppercase">{head.badge}</span>
            </span>
            <h1 className="mb-1 text-[1.25rem] font-bold tracking-[-0.01em] text-ink sm:text-[1.45rem]">{head.title}</h1>
            <p className="text-[0.82rem] leading-snug text-muted">{head.sub}</p>
            {expired && step === 'credentials' && (
              <p className="mt-3 rounded-[10px] border border-gold-500/30 bg-gold-500/10 px-3 py-2 text-[0.78rem] font-medium text-gold-700">
                Your session has expired. Please sign in again.
              </p>
            )}
          </div>

          {step === 'credentials' && (
            <>
              {emailField}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="password" className="text-[0.8rem] font-semibold text-ink">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => go('forgot')}
                    className="text-[0.78rem] font-semibold text-brand-600 transition hover:text-brand-800 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className={inputWrap(!!errors.password)}>
                  <Lock className={cn('size-[18px] shrink-0', errors.password ? 'text-[#EF4444]' : 'text-muted')} />
                  <input
                    id="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent text-[0.9rem] text-ink outline-none placeholder:text-subtle"
                  />
                  <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="-mr-1 rounded-md p-1 text-muted hover:text-ink">
                    {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
                {fieldError(errors.password)}
              </div>
            </>
          )}

          {step === 'otp' && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[0.8rem] font-semibold text-ink">Verification Code</label>
              <OtpBoxes value={code} onChange={setCode} hasError={!!errors.code} autoFocus />
              {fieldError(errors.code)}
              {resendRow}
            </div>
          )}

          {step === 'forgot' && emailField}

          {step === 'reset' && (
            <>
              <div className="mb-4">
                <label className="mb-1.5 block text-[0.8rem] font-semibold text-ink">Reset Code</label>
                <OtpBoxes value={code} onChange={setCode} hasError={!!errors.code} autoFocus />
                {fieldError(errors.code)}
                {resendRow}
              </div>
              <div className="mb-4">
                <label htmlFor="new-password" className="mb-1 block text-[0.8rem] font-semibold text-ink">
                  New Password
                </label>
                <div className={inputWrap(!!errors.newPassword)}>
                  <Lock className={cn('size-[18px] shrink-0', errors.newPassword ? 'text-[#EF4444]' : 'text-muted')} />
                  <input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="h-full min-w-0 flex-1 bg-transparent text-[0.9rem] text-ink outline-none placeholder:text-subtle"
                  />
                  <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="-mr-1 rounded-md p-1 text-muted hover:text-ink">
                    {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
                {fieldError(errors.newPassword)}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-[10px] text-[0.95rem] font-semibold text-white shadow-[0_6px_18px_-3px_rgba(200,16,46,0.4),0_3px_10px_-2px_rgba(245,158,11,0.28)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_10px_24px_-3px_rgba(200,16,46,0.5),0_4px_14px_-2px_rgba(245,158,11,0.38)] active:translate-y-0 disabled:opacity-65"
            style={{ backgroundImage: 'linear-gradient(90deg, #C8102E 0%, #D97706 45%, #F59E0B 80%, #FFD700 100%)' }}>
            {loading ? (
              <>
                <Loader2 className="size-[18px] animate-spin" />
                {head.busy}
              </>
            ) : (
              <>
                {head.cta}
                <ArrowRight className="size-[15px]" />
              </>
            )}
          </button>
          {step === 'credentials' && <p className="mt-4 text-center text-[0.74rem] text-subtle">Protected by two-step verification.</p>}
        </form>
      </div>
    </div>
  )
}
