const PROFILE_ID_KEY = "edumatch-profile-id";

export function saveProfileId(profileId: number) {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    throw new Error("Invalid profile ID.");
  }

  localStorage.setItem(PROFILE_ID_KEY, String(profileId));
}

export function getStoredProfileId(): number | null {
  const storedId = localStorage.getItem(PROFILE_ID_KEY);

  if (!storedId) return null;

  const profileId = Number(storedId);

  if (!Number.isSafeInteger(profileId) || profileId <= 0) {
    localStorage.removeItem(PROFILE_ID_KEY);
    return null;
  }

  return profileId;
}

export function clearStoredProfileId() {
  localStorage.removeItem(PROFILE_ID_KEY);
}