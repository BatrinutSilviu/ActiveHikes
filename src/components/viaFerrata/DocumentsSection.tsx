import { FileText, Download } from 'lucide-react'

type ViaFerrataDoc = { id: string; url: string; name: string }

export default function DocumentsSection({ documents, title, hint }: {
  documents: ViaFerrataDoc[]
  title: string
  hint: string
}) {
  if (documents.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-stone-800 flex items-center gap-2">
        <FileText size={18} /> {title}
      </h3>
      <p className="text-stone-500 text-sm">{hint}</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {documents.map(document => (
          <li key={document.id}>
            <a href={document.url} target="_blank" rel="noopener noreferrer" download
              className="flex items-center gap-2.5 bg-stone-50 border border-stone-100 rounded-xl px-3.5 py-2.5 text-sm text-stone-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
              <FileText size={14} className="text-emerald-500 shrink-0" />
              <span className="flex-1 truncate">{document.name}</span>
              <Download size={14} className="text-stone-400 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
