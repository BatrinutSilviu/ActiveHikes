import { revalidatePath } from 'next/cache'
import { revalidateLocalePaths } from '@/lib/i18n'

// Every page that shows a participant/spot count for this Via Ferrata event needs to be
// revalidated whenever a registration is added, imported, or changes status.
export function revalidateViaFerrataParticipantCountPaths(viaFerrataId: string) {
  revalidateLocalePaths(`/admin/via-ferrata/${viaFerrataId}`, revalidatePath)
  revalidateLocalePaths(`/via-ferrata/${viaFerrataId}`, revalidatePath)
  revalidateLocalePaths('/via-ferrata', revalidatePath)
  revalidateLocalePaths('/admin', revalidatePath)
  revalidateLocalePaths('/admin/via-ferrata-participants', revalidatePath)
  revalidateLocalePaths('', revalidatePath)
}
