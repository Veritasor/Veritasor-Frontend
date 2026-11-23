import type { OnboardingDraft } from '../hooks/useOnboardingDraft'
import type { FileMap } from '../pages/onboarding/DocumentUploadStep'
import { ApiError, request } from './apiClient'

export interface SubmitOnboardingPayload {
  draft: OnboardingDraft
  selfieFile: File | null
  documentFiles: FileMap
}

export async function submitOnboardingApplication({
  draft,
  selfieFile,
  documentFiles,
}: SubmitOnboardingPayload): Promise<unknown> {
  const formData = new FormData()

  const draftJson = JSON.stringify({ ...draft, status: 'pending_review' })
  formData.append('draft', draftJson)

  if (selfieFile) {
    formData.append('selfie', selfieFile)
  }

  const docKeys: (keyof FileMap)[] = ['registrationCert', 'govIdFront', 'govIdBack', 'proofOfAddress']
  for (const key of docKeys) {
    const files = documentFiles[key] || []
    for (const file of files) {
      formData.append(key, file)
    }
  }

  try {
    return await request('/api/onboarding/submit', {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.code === 'NETWORK_ERROR' || err.code === 'TIMEOUT') {
        throw new Error(
          'Network error: unable to submit onboarding application. Please check your connection and try again.',
        )
      }
      if (err.status > 0 && err.code !== 'INVALID_RESPONSE') {
        throw new Error(`Submission failed with status ${err.status}: ${err.message || 'Server error'}`)
      }
      throw new Error(err.message)
    }
    throw new Error(
      'Network error: unable to submit onboarding application. Please check your connection and try again.',
    )
  }
}
