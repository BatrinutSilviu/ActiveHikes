import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'

// Every page that shows a participant/spot count for this hike needs to be
// revalidated whenever a registration is added, imported, or changes status.
export function revalidateParticipantCountPaths(hikeId: string) {
  revalidateLocalePaths(`/admin/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths(`/hikes/${hikeId}`, revalidatePath)
  revalidateLocalePaths('/hikes', revalidatePath)
  revalidateLocalePaths('/admin', revalidatePath)
  revalidateLocalePaths('/admin/participants', revalidatePath)
  revalidateLocalePaths('', revalidatePath)
}
