export const SUPPORTED_LOCALES = ['en', 'zh', 'zh-CN', 'zh-TW'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const LOCALE_PREFERENCE_KEY = 'unicucumber_locale'

export const normalizeLocale = (language?: string): SupportedLocale => {
  const normalized = language?.trim().toLowerCase() ?? ''
  if (!normalized.startsWith('zh')) return 'en'
  if (normalized.includes('cn') || normalized.includes('hans')) return 'zh-CN'
  if (normalized.includes('tw') || normalized.includes('hant')) return 'zh-TW'
  return 'zh'
}
