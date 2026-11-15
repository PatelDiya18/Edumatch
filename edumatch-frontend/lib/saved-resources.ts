
import type { Resource } from '@/lib/resources'

const STORAGE_KEY = 'learntwin-saved-resources'
const UPDATE_EVENT = 'learntwin-saved-resources-updated'

export function getSavedResources(): Resource[] {
  if (typeof window === 'undefined') return []

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return []

    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? (parsed as Resource[]) : []
  } catch {
    return []
  }
}

function notifyUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(UPDATE_EVENT))
  }
}

export function isResourceSaved(url: string): boolean {
  return getSavedResources().some((resource) => resource.url === url)
}

export function saveResource(resource: Resource): void {
  const saved = getSavedResources()

  if (saved.some((item) => item.url === resource.url)) return

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...saved, resource])
  )

  notifyUpdate()
}

export function removeSavedResource(url: string): void {
  const updated = getSavedResources().filter(
    (resource) => resource.url !== url
  )

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  notifyUpdate()
}

export function toggleSavedResource(resource: Resource): boolean {
  if (isResourceSaved(resource.url)) {
    removeSavedResource(resource.url)
    return false
  }

  saveResource(resource)
  return true
}

export function subscribeToSavedResources(
  callback: () => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener(UPDATE_EVENT, callback)
  window.addEventListener('storage', callback)

  return () => {
    window.removeEventListener(UPDATE_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}
