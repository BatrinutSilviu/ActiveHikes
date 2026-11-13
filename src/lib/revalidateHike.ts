import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'
import { notifyManagement } from '@/lib/managementSync'

// Every page that shows a participant/spot count for this event needs to be
// revalidated whenever a registration is added, imported, or changes status.
// Hikes, Via Ferrata and general events share the same table, so a given id only
// ever resolves under one of the path prefixes — revalidating the others too is a
// harmless no-op.
export function revalidateParticipantCountPaths(hikeId: string) {
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/events/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/events/${hikeId}`, revalidatePath)
  revalidateLocalePaths('/events', revalidatePath)
  revalidateLocalePaths('/hikes', revalidatePath)
  revalidateLocalePaths('/via-ferrata', revalidatePath)
  revalidateLocalePaths('/admin', revalidatePath)
  revalidateLocalePaths('/admin/participants', revalidatePath)
  revalidateLocalePaths('', revalidatePath)
  // Called after every change to a hike or its participants: keep the management app's event in step.
  notifyManagement(hikeId)
}
