import { Download, Map } from 'lucide-react'
import GpxMapWrapper from './GpxMapWrapper'

type GpxDict = {
  title: string
  approximateRoute: string
  approximateDesc: string
  actualRoute: string
  actualDesc: string
  legendPlanned: string
  legendRecorded: string
  download: string
}

export default function GpxSection({
  approximateUrl,
  actualUrl,
  isCompleted,
  dict,
}: {
  approximateUrl: string | null
  actualUrl: string | null
  isCompleted: boolean
  dict: GpxDict
}) {
  if (!approximateUrl && !actualUrl) return null

  const showBothInLegend = approximateUrl && actualUrl

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-stone-800 flex items-center gap-2">
        <Map size={18} /> {dict.title}
      </h3>

      <GpxMapWrapper approximateUrl={approximateUrl} actualUrl={actualUrl} />

      {/* Legend — only shown when there's something to distinguish */}
      {showBothInLegend && (
        <div className="flex flex-wrap gap-4 text-sm text-stone-600 px-1">
          <div className="flex items-center gap-2">
            <svg width="28" height="10" className="shrink-0">
              <line x1="0" y1="5" x2="28" y2="5" stroke="#d97706" strokeWidth="2.5" strokeDasharray="6 4" />
            </svg>
            <span>{dict.legendPlanned}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="28" height="10" className="shrink-0">
              <line x1="0" y1="5" x2="28" y2="5" stroke="#059669" strokeWidth="2.5" />
            </svg>
            <span>{dict.legendRecorded}</span>
          </div>
        </div>
      )}

      {/* Download buttons */}
      <div className="flex flex-wrap gap-2">
        {approximateUrl && (
          <a
            href={approximateUrl}
            download
            className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 hover:bg-stone-100 transition-colors text-sm"
          >
            <Download size={15} className="text-amber-600 shrink-0" />
            <span className="font-medium text-stone-800">
              {dict.download} · {dict.approximateRoute}
            </span>
          </a>
        )}
        {actualUrl && (
          <a
            href={actualUrl}
            download
            className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 hover:bg-stone-100 transition-colors text-sm"
          >
            <Download size={15} className="text-emerald-600 shrink-0" />
            <span className="font-medium text-stone-800">
              {dict.download} · {dict.actualRoute}
            </span>
          </a>
        )}
      </div>
    </div>
  )
}
