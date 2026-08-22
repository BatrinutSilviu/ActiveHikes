import { FileText, User } from 'lucide-react'

type Upload = { id: string; url: string; fileName: string; participantName: string; isPreview: boolean }

export default function ParticipantDocumentUploads({ uploads, dict }: {
  uploads: Upload[]
  dict: { title: string; hint: string; empty: string; previewLabel: string }
}) {
  return (
    <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-3">
      <h2 className="text-xl font-bold text-stone-800">{dict.title}</h2>
      <p className="text-xs text-stone-400">{dict.hint}</p>
      {uploads.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-2">{dict.empty}</p>
      ) : (
        <div className="space-y-2">
          {uploads.map(upload => (
            <a key={upload.id} href={upload.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
              <FileText size={16} className="text-emerald-500 shrink-0" />
              <span className="flex-1 truncate text-sm text-stone-700">{upload.fileName}</span>
              <span className="flex items-center gap-1 text-xs text-stone-400 shrink-0">
                <User size={11} /> {upload.isPreview ? dict.previewLabel : upload.participantName}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
