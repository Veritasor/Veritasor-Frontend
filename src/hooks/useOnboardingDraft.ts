import { useState, useEffect, useCallback } from 'react'

export type BusinessDetails = {
  legalName: string
  registrationNumber: string
  country: string
  businessType: string
  website: string
}

export type OwnerDetails = {
  fullName: string
  dateOfBirth: string
  nationality: string
  addressLine1: string
  addressLine2: string
  city: string
  postalCode: string
}

export type DocumentUpload = {
  registrationCert: string[]   // file names (actual File objects held in component state)
  govIdFront: string[]
  govIdBack: string[]
  proofOfAddress: string[]
}

export type SelfieCapture = {
  captured: boolean
  fileName: string
}

export type BankDetails = {
  bankName: string
  accountNumber: string
  ibanSwift: string
  currency: string
}

export type OnboardingDraft = {
  version: number
  step: number
  business: BusinessDetails
  owner: OwnerDetails
  selfie: SelfieCapture
  documents: DocumentUpload
  bank: BankDetails
}

const STORAGE_KEY = 'veritasor_onboarding_draft'

export const DRAFT_VERSION = 1
export const TOTAL_STEPS = 6
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
export const SENSITIVE_STORAGE_KEY = 'veritasor_onboarding_draft_sensitive'

const INITIAL_DRAFT: OnboardingDraft = {
  version: DRAFT_VERSION,
  step: 1,
  business: { legalName: '', registrationNumber: '', country: '', businessType: '', website: '' },
  owner: { fullName: '', dateOfBirth: '', nationality: '', addressLine1: '', addressLine2: '', city: '', postalCode: '' },
  selfie: { captured: false, fileName: '' },
  documents: { registrationCert: [], govIdFront: [], govIdBack: [], proofOfAddress: [] },
  bank: { bankName: '', accountNumber: '', ibanSwift: '', currency: '' },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function parseBusiness(value: unknown): BusinessDetails {
  const v = isRecord(value) ? value : {}
  return {
    legalName: asString(v.legalName),
    registrationNumber: asString(v.registrationNumber),
    country: asString(v.country),
    businessType: asString(v.businessType),
    website: asString(v.website),
  }
}

function parseOwner(value: unknown): OwnerDetails {
  const v = isRecord(value) ? value : {}
  return {
    fullName: asString(v.fullName),
    dateOfBirth: asString(v.dateOfBirth),
    nationality: asString(v.nationality),
    addressLine1: asString(v.addressLine1),
    addressLine2: asString(v.addressLine2),
    city: asString(v.city),
    postalCode: asString(v.postalCode),
  }
}

function parseSelfie(value: unknown): SelfieCapture {
  const v = isRecord(value) ? value : {}
  return {
    captured: v.captured === true,
    fileName: asString(v.fileName),
  }
}

function parseDocuments(value: unknown): DocumentUpload {
  const v = isRecord(value) ? value : {}
  return {
    registrationCert: asStringArray(v.registrationCert),
    govIdFront: asStringArray(v.govIdFront),
    govIdBack: asStringArray(v.govIdBack),
    proofOfAddress: asStringArray(v.proofOfAddress),
  }
}

function parseBank(value: unknown): BankDetails {
  const v = isRecord(value) ? value : {}
  return {
    bankName: asString(v.bankName),
    accountNumber: asString(v.accountNumber),
    ibanSwift: asString(v.ibanSwift),
    currency: asString(v.currency),
  }
}

function normalizeStep(value: unknown): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN

  if (!Number.isFinite(parsed)) return 1

  const integer = Math.trunc(parsed)
  return Math.min(TOTAL_STEPS, Math.max(1, integer))
}

function hasText(value: string): boolean {
  return value.trim().length > 0
}

const STEP_PREREQUISITES: ((draft: OnboardingDraft) => boolean)[] = [
  draft => (
    hasText(draft.business.legalName) &&
    hasText(draft.business.registrationNumber) &&
    hasText(draft.business.country) &&
    hasText(draft.business.businessType)
  ),
  draft => (
    hasText(draft.owner.fullName) &&
    hasText(draft.owner.dateOfBirth) &&
    hasText(draft.owner.nationality) &&
    hasText(draft.owner.addressLine1) &&
    hasText(draft.owner.city) &&
    hasText(draft.owner.postalCode)
  ),
  draft => draft.selfie.captured,
  draft => (
    draft.documents.registrationCert.length > 0 &&
    draft.documents.govIdFront.length > 0 &&
    draft.documents.govIdBack.length > 0 &&
    draft.documents.proofOfAddress.length > 0
  ),
  draft => (
    hasText(draft.bank.bankName) &&
    hasText(draft.bank.accountNumber) &&
    hasText(draft.bank.ibanSwift) &&
    hasText(draft.bank.currency)
  ),
]

function firstIncompleteStep(draft: OnboardingDraft): number {
  for (let step = 1; step < TOTAL_STEPS; step++) {
    if (!STEP_PREREQUISITES[step - 1](draft)) return step
  }
  return TOTAL_STEPS
}

/**
 * Resolve the step a draft is allowed to render. A persisted draft may claim
 * any step, so clamp to the first step whose prerequisites are incomplete and
 * to the valid 1..TOTAL_STEPS range.
 */
export function resolveStep(draft: OnboardingDraft): number {
  return Math.min(normalizeStep(draft.step), firstIncompleteStep(draft))
}

/**
 * Validate and normalise an untrusted persisted draft. Never throws: corrupt
 * JSON or unexpected shapes fall back to the empty draft.
 */
export function parseDraft(raw: string | null | undefined): OnboardingDraft {
  if (!raw) return INITIAL_DRAFT

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return INITIAL_DRAFT
  }

  if (!isRecord(data)) return INITIAL_DRAFT

  const parsed: OnboardingDraft = {
    version: DRAFT_VERSION,
    step: normalizeStep(data.step),
    business: parseBusiness(data.business),
    owner: parseOwner(data.owner),
    selfie: parseSelfie(data.selfie),
    documents: parseDocuments(data.documents),
    bank: parseBank(data.bank),
  }

  parsed.step = resolveStep(parsed)
  return parsed
}

type SensitiveDraftParts = {
  owner: {
    dateOfBirth: string
    nationality: string
    addressLine1: string
    addressLine2: string
    city: string
    postalCode: string
  }
  bank: {
    accountNumber: string
    ibanSwift: string
  }
}

export function splitDraft(draft: OnboardingDraft): {
  persisted: Record<string, unknown>
  sensitive: SensitiveDraftParts
} {
  const { owner, bank, ...rest } = draft
  const persisted = {
    ...rest,
    owner: {
      fullName: owner.fullName,
    },
    bank: {
      bankName: bank.bankName,
      currency: bank.currency,
    },
    updatedAt: Date.now(),
  }

  const sensitive: SensitiveDraftParts = {
    owner: {
      dateOfBirth: owner.dateOfBirth,
      nationality: owner.nationality,
      addressLine1: owner.addressLine1,
      addressLine2: owner.addressLine2,
      city: owner.city,
      postalCode: owner.postalCode,
    },
    bank: {
      accountNumber: bank.accountNumber,
      ibanSwift: bank.ibanSwift,
    },
  }

  return { persisted, sensitive }
}

function hasSensitiveKeys(rawObj: Record<string, unknown>): boolean {
  if (isRecord(rawObj.owner)) {
    const owner = rawObj.owner
    if (
      asString(owner.dateOfBirth).trim() !== '' ||
      asString(owner.nationality).trim() !== '' ||
      asString(owner.addressLine1).trim() !== '' ||
      asString(owner.addressLine2).trim() !== '' ||
      asString(owner.city).trim() !== '' ||
      asString(owner.postalCode).trim() !== ''
    ) {
      return true
    }
  }
  if (isRecord(rawObj.bank)) {
    const bank = rawObj.bank
    if (
      asString(bank.accountNumber).trim() !== '' ||
      asString(bank.ibanSwift).trim() !== ''
    ) {
      return true
    }
  }
  return false
}

export function purgeExpiredOrLegacyDraft(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false

    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return false
    }

    if (!isRecord(parsed)) return false

    // Check TTL (7 days)
    if (typeof parsed.updatedAt === 'number') {
      const age = Date.now() - parsed.updatedAt
      if (age > DRAFT_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY)
        try {
          sessionStorage.removeItem(SENSITIVE_STORAGE_KEY)
        } catch {
          // ignore
        }
        return true
      }
    }

    // Check legacy draft with sensitive keys in localStorage
    if (hasSensitiveKeys(parsed)) {
      localStorage.removeItem(STORAGE_KEY)
      try {
        sessionStorage.removeItem(SENSITIVE_STORAGE_KEY)
      } catch {
        // ignore
      }
      return true
    }

    return false
  } catch {
    return false
  }
}

export function loadStoredDraft(): OnboardingDraft {
  try {
    const rawLocal = localStorage.getItem(STORAGE_KEY)
    if (!rawLocal) return INITIAL_DRAFT

    let parsedRaw: unknown
    try {
      parsedRaw = JSON.parse(rawLocal)
    } catch {
      return INITIAL_DRAFT
    }

    if (!isRecord(parsedRaw)) return INITIAL_DRAFT

    // Discard drafts older than TTL
    if (typeof parsedRaw.updatedAt === 'number') {
      const age = Date.now() - parsedRaw.updatedAt
      if (age > DRAFT_TTL_MS) {
        localStorage.removeItem(STORAGE_KEY)
        try {
          sessionStorage.removeItem(SENSITIVE_STORAGE_KEY)
        } catch {
          // ignore
        }
        return INITIAL_DRAFT
      }
    }

    // Clear legacy full draft with sensitive keys in localStorage on load
    if (hasSensitiveKeys(parsedRaw)) {
      localStorage.removeItem(STORAGE_KEY)
      try {
        sessionStorage.removeItem(SENSITIVE_STORAGE_KEY)
      } catch {
        // ignore
      }
      return INITIAL_DRAFT
    }

    const baseDraft = parseDraft(rawLocal)

    let sensitive: Partial<SensitiveDraftParts> = {}
    try {
      const rawSession = sessionStorage.getItem(SENSITIVE_STORAGE_KEY)
      if (rawSession) {
        sensitive = JSON.parse(rawSession) as Partial<SensitiveDraftParts>
      }
    } catch {
      // sessionStorage unavailable or parse error
    }

    const merged: OnboardingDraft = {
      ...baseDraft,
      owner: {
        ...baseDraft.owner,
        ...(sensitive.owner ?? {}),
      },
      bank: {
        ...baseDraft.bank,
        ...(sensitive.bank ?? {}),
      },
    }

    merged.step = resolveStep(merged)
    return merged
  } catch {
    return INITIAL_DRAFT
  }
}

export function saveStoredDraft(draft: OnboardingDraft): void {
  const { persisted, sensitive } = splitDraft(draft)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  try {
    sessionStorage.setItem(SENSITIVE_STORAGE_KEY, JSON.stringify(sensitive))
  } catch {
    // sessionStorage unavailable
  }
}

export function useOnboardingDraft() {
  const [draft, setDraftState] = useState<OnboardingDraft>(() => {
    return loadStoredDraft()
  })

  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const setDraft = useCallback((updater: Partial<OnboardingDraft> | ((prev: OnboardingDraft) => OnboardingDraft)) => {
    setDraftState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      try {
        saveStoredDraft(next)
        setSavedAt(new Date())
      } catch {
        // storage full or unavailable
      }
      return next
    })
  }, [])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(SENSITIVE_STORAGE_KEY)
    } catch {
      // ignore
    }
    setDraftState(INITIAL_DRAFT)
    setSavedAt(null)
  }, [])

  // Persist on mount if draft already existed
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSavedAt(new Date())
    } catch {
      // Storage unavailable (private mode / blocked): keep the in-memory draft.
    }
  }, [])

  return { draft, setDraft, clearDraft, savedAt }
}
