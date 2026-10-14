const digitsOf = (v: string) => v.replace(/\D/g, '')

export const isPhone = (v: string) => {
  const d = digitsOf(v)
  return /^(91)?[6-9]\d{9}$/.test(d)
}
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
export const normalizePhone = (v: string) => `+91 ${digitsOf(v).slice(-10)}`
