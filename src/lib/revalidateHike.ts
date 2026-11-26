import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'
import { notifyManagement } from '@/lib/managementSync'
import { logger } from '@/lib/logger'

// Every page that shows a participant/spot count for this event needs to be
// revalidated whenever a registration is added, imported, or changes status.
// Hikes, Via Ferrata and general events share the same table, so a given id only
// ever resolves under one of the path prefixes — revalidating the others too is a
// harmless no-op.
export function revalidateParticipantCountPaths(hikeId: string) {
  // Called after every change to a hike or its participants: keep the management app's event in step. First, so it
  // also happens for changes made outside a request (the bank payment sync), where pages can't be revalidated.
  notifyManagement(hikeId)
  try {
    revalidatePages(hikeId)
  } catch (err) {
    // Outside a request (the background bank sync) Next has no pages to revalidate ("static generation store
    // missing"); they refresh on their next render. Any other error is a real one.
    if (!(err instanceof Error && /static generation store missing/i.test(err.message))) throw err
    logger.info('pages not revalidated outside a request', { hikeId })
  }
}

function revalidatePages(hikeId: string) {
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/events/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/events/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/events/${hikeId}/manage`, revalidatePath)
  revalidateLocalePaths('/events', revalidatePath)
  revalidateLocalePaths('/hikes', revalidatePath)
  revalidateLocalePaths('/via-ferrata', revalidatePath)
  revalidateLocalePaths('/admin', revalidatePath)
  revalidateLocalePaths('/admin/participants', revalidatePath)
  revalidateLocalePaths('', revalidatePath)
}
