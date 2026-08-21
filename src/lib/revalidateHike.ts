import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'

// Every page that shows a participant/spot count for this event needs to be
// revalidated whenever a registration is added, imported, or changes status.
// Hikes and Via Ferrata events share the same table now, so a given id only
// ever resolves under one of the two path prefixes — revalidating the other
// prefix too is a harmless no-op.
export function revalidateParticipantCountPaths(hikeId: string) {
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/admin/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${hikeId}`, revalidatePath)
  revalidateLocalePaths('/hikes', revalidatePath)
  revalidateLocalePaths('/via-ferrata', revalidatePath)
  revalidateLocalePaths('/admin', revalidatePath)
  revalidateLocalePaths('/admin/participants', revalidatePath)
  revalidateLocalePaths('', revalidatePath)
}
