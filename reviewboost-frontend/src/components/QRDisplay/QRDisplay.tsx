import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, Link as LinkIcon, Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface QRDisplayProps {
  slug: string
  restaurantName?: string
  dark?: boolean
}

export default function QRDisplay({ slug }: QRDisplayProps) {
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const reviewUrl = `${window.location.origin}/r/${slug}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(reviewUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadQR = () => {
    const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}-qr.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-4 bg-white rounded-2xl shadow-md" ref={containerRef}>
        <QRCodeCanvas value={reviewUrl} size={160} fgColor="#1f2937" bgColor="transparent" level="M" />
      </div>

      <div className="flex gap-2">
        <button
          onClick={copyLink}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all',
            copied
              ? 'border-green-200 text-green-600 bg-green-50'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50',
          )}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <button
          onClick={downloadQR}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
      </div>
    </div>
  )
}
