const PROFILE_ID_STORAGE_KEY = 'edumatch-profile-id'

export function saveProfileId(profileId: number) {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    throw new Error('Cannot save an invalid student profile ID.')
  }

  window.localStorage.setItem(PROFILE_ID_STORAGE_KEY, String(profileId))
}

export function getStoredProfileId(): number | null {
  const storedProfileId = window.localStorage.getItem(PROFILE_ID_STORAGE_KEY)

  if (storedProfileId === null) {
    return null
  }

  const profileId = Number(storedProfileId)
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    throw new Error('Saved student profile ID is invalid. Please complete onboarding again.')
  }

  return profileId
}
