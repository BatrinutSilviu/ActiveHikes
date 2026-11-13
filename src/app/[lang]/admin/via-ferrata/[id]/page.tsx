import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import ParticipantManager from '@/components/admin/ParticipantManager'
import WhatsAppGroupCompare from '@/components/admin/WhatsAppGroupCompare'
import ViaFerrataEditForm from '@/components/admin/ViaFerrataEditForm'
import ViaFerrataDocumentUploader from '@/components/admin/ViaFerrataDocumentUploader'
import ParticipantDocumentUploads from '@/components/admin/ParticipantDocumentUploads'
import { DATE_LONG, isEventPast } from '@/lib/dates'
import { AdminActionLink, AdminEventHeader, AdminRegistrationCard, StatusCountsGrid } from '@/components/admin/AdminEventParts'
import { toRegistration } from '@/components/events/join/registration'
import { Car } from 'lucide-react'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { waitlistOverduePending } from '@/lib/expireParticipants'
import { advanceEventStatuses } from '@/lib/autoAdvanceStatus'
import { participantStats, waitlistPosition } from '@/lib/participantStats'
import { managedParticipantInclude, toManagedParticipant } from '@/lib/adminParticipants'

export default async function AdminViaFerrataPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params
  if (!hasLocale(lang)) notFound()

  await Promise.all([waitlistOverduePending(), advanceEventStatuses()])

  const [d, session, viaFerrata, bankAccounts] = await Promise.all([
    getDictionary(lang),
    getServerSession(authOptions),
    prisma.hike.findFirst({
      where: { id, type: 'via_ferrata' },
      include: {
        participants: { include: managedParticipantInclude, orderBy: { joinedAt: 'asc' } },
        documents: { orderBy: { createdAt: 'asc' } },
        documentSubmissions: {
          include: {
            participant: { select: { friendName: true, user: { select: { name: true } } } },
            previewAdmin: { select: { name: true } },
          },
          orderBy: { submittedAt: 'asc' },
        },
        bankAccounts: { where: { isActive: true }, select: { id: true } },
      },
    }),
    prisma.bankAccount.findMany({ where: { isActive: true } }),
  ])

  if (!viaFerrata) notFound()

  const da = d.admin.viaFerrata

  const adminParticipation = session?.user?.id
    ? viaFerrata.participants.find(p => p.userId === session.user.id) ?? null
    : null

  const { waitlistCount, isFull } = participantStats(viaFerrata.participants, viaFerrata.maxParticipants)
  const participants = viaFerrata.participants.map(toManagedParticipant)

  const viaFerrataData = {
    id: viaFerrata.id,
    title: viaFerrata.title,
    destination: viaFerrata.destination,
    description: viaFerrata.description,
    date: viaFerrata.date.toISOString(),
    maxParticipants: viaFerrata.maxParticipants,
    durationHours: viaFerrata.durationHours ? Number(viaFerrata.durationHours) : null,
    startingPoint: viaFerrata.startingPoint,
    meetingPoint: viaFerrata.meetingPoint,
    meetingTime: viaFerrata.meetingTime,
    groupCount: viaFerrata.groupCount,
    essentials: viaFerrata.essentials,
    status: viaFerrata.status,
    coverImageUrl: viaFerrata.coverImageUrl,
    coverImageUrl2: viaFerrata.coverImageUrl2,
    totalPrice: viaFerrata.accommodationPrice ? Number(viaFerrata.accommodationPrice) : null,
    advanceFee: viaFerrata.accommodationDeposit ? Number(viaFerrata.accommodationDeposit) : null,
    whatsappGroupUrl: viaFerrata.whatsappGroupUrl,
    bankAccountIds: viaFerrata.bankAccounts.map(a => a.id),
  }

  const documents = viaFerrata.documents.map(document => ({
    id: document.id,
    url: document.url,
    name: document.name,
    requiresUpload: document.requiresUpload,
  }))

  const documentUploads = viaFerrata.documentSubmissions.map(submission => ({
    id: submission.id,
    url: submission.url,
    fileName: submission.fileName,
    participantName: submission.participant?.friendName ?? submission.participant?.user?.name ?? '—',
    isPreview: !!submission.previewAdmin,
  }))

  const documentUploadParticipants = viaFerrata.participants
    .filter(p => p.status !== 'rejected')
    .map(p => ({ id: p.id, name: p.friendName ?? p.user?.name ?? p.user?.email ?? '—' }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <AdminEventHeader
        lang={lang}
        title={viaFerrata.title}
        subtitle={`${viaFerrata.destination} · ${new Date(viaFerrata.date).toLocaleDateString(d.locale, DATE_LONG)}`}
        publicUrl={`/${lang}/via-ferrata/${viaFerrata.id}`}
        statusControl={{ hikeId: viaFerrata.id, status: viaFerrata.status, isPast: isEventPast(viaFerrata.date, viaFerrata.endDate, viaFerrata), dict: d.admin.hikeStatus }}
        dict={da}
      />

      <StatusCountsGrid participants={viaFerrata.participants} labels={da.status as Record<string, string>} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-bold text-stone-800 mb-4">{da.participantsTitle}</h2>
          <ParticipantManager participants={participants} hikeId={viaFerrata.id} maxParticipants={viaFerrata.maxParticipants} dict={da} />

          <div className="mt-6">
            <WhatsAppGroupCompare
              eventId={viaFerrata.id}
              participants={participants}
              adminUserId={session?.user?.id ?? null}
              statusLabels={da.status as Record<string, string>}
              dict={{ ...d.admin.whatsappCompare, copyPhone: da.copyPhone, phoneCopied: da.phoneCopied, openWhatsApp: da.openWhatsApp }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-4">{da.editTitle}</h2>
            <ViaFerrataEditForm viaFerrata={viaFerrataData} bankAccounts={bankAccounts} dict={d.admin.viaFerrataEdit} />
          </div>

          <ViaFerrataDocumentUploader viaFerrataId={viaFerrata.id} existingDocuments={documents} dict={da.documents} />

          <ParticipantDocumentUploads hikeId={viaFerrata.id} uploads={documentUploads} participants={documentUploadParticipants} dict={da.documentUploads} />

          <AdminRegistrationCard
            title={da.myRegistration}
            hikeId={viaFerrata.id}
            userId={session?.user?.id ?? null}
            isFull={isFull}
            registration={toRegistration(adminParticipation)}
            waitlistPosition={waitlistPosition(viaFerrata.participants, session?.user?.id, adminParticipation?.status)}
            waitlistCount={waitlistCount}
            dict={d.joinButton}
            tripDict={d.carTrip}
            lang={lang}
          />

          {/* Via Ferrata events share the hikes' car management page. */}
          <AdminActionLink color="sky" href={`/${lang}/admin/hikes/${viaFerrata.id}/cars`} icon={<Car size={20} />} label={da.manageCars} />
        </div>
      </div>
    </div>
  )
}
