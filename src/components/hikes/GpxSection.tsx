import { Download, Map } from 'lucide-react'
import GpxMapWrapper from './GpxMapWrapper'

type GpxDict = {
  title: string
  approximateRoute: string
  approximateDesc: string
  actualRoute: string
  actualDesc: string
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

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-stone-800 flex items-center gap-2">
        <Map size={18} /> {dict.title}
      </h3>

      <GpxMapWrapper approximateUrl={approximateUrl} actualUrl={actualUrl} />

      {(approximateUrl || actualUrl) && (
        <div className="flex flex-wrap gap-2">
          {approximateUrl && (
            <a
              href={approximateUrl}
              download
              className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 hover:bg-stone-100 transition-colors text-sm"
            >
              <Download size={15} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-medium text-stone-800">{dict.approximateRoute}</span>
                <span className="text-stone-400 ml-1 hidden sm:inline">· {dict.approximateDesc}</span>
              </div>
            </a>
          )}
          {actualUrl && (
            <a
              href={actualUrl}
              download
              className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-4 py-2.5 hover:bg-stone-100 transition-colors text-sm"
            >
              <Download size={15} className="text-emerald-600 shrink-0" />
              <div>
                <span className="font-medium text-stone-800">{dict.actualRoute}</span>
                <span className="text-stone-400 ml-1 hidden sm:inline">· {dict.actualDesc}</span>
              </div>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
