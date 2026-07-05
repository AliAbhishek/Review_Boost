import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, ShoppingBag, Receipt, Package, Tag, X, CheckSquare, Square, Users } from 'lucide-react'
import { billApi, type AnalyticsPeriod, type TimelinePoint, type LeaderboardItem } from '@/api/billApi'
import { menuApi } from '@/api/menuApi'
import { cn } from '@/utils/cn'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_00_000 ? `₹${(n / 1_00_000).toFixed(1)}L`
  : n >= 1_000 ? `₹${(n / 1_000).toFixed(1)}K`
  : `₹${n.toFixed(0)}`

const pct = (curr: number, prev: number) => {
  if (!prev) return null
  return Math.round(((curr - prev) / prev) * 100)
}

const fmtLabel = (label: string, period: AnalyticsPeriod) => {
  if (period === 'day') return label
  const d = new Date(label)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Bar chart ───────────────────────────────────────────────────────────────
function BarChart({ data, period }: { data: TimelinePoint[]; period: AnalyticsPeriod }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.revenue), 1)

  // For day view only show hours with data or every 4h; for others show every Nth label
  const labelEvery = period === 'day' ? 4 : data.length > 14 ? Math.ceil(data.length / 10) : 1

  return (
    <div className="relative">
      {hovered !== null && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none z-10 whitespace-nowrap">
          {fmtLabel(data[hovered].label, period)} — {fmt(data[hovered].revenue)} · {data[hovered].bills} bill{data[hovered].bills !== 1 ? 's' : ''}
        </div>
      )}
      <svg
        viewBox={`0 0 ${data.length * 20} 80`}
        className="w-full h-40 mt-6"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <line key={r} x1={0} y1={80 - r * 68} x2={data.length * 20} y2={80 - r * 68}
            stroke="#f3f4f6" strokeWidth={0.5} />
        ))}
        {data.map((d, i) => {
          const h = (d.revenue / max) * 68
          const x = i * 20 + 2
          const isHovered = hovered === i
          return (
            <g key={i}>
              <rect
                x={x} y={80 - h} width={16} height={h}
                rx={3}
                fill={isHovered ? '#4f46e5' : d.revenue > 0 ? '#818cf8' : '#f1f5f9'}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            </g>
          )
        })}
      </svg>
      {/* X-axis labels */}
      <div className="flex mt-1 overflow-hidden">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {i % labelEvery === 0 && (
              <span className="text-[9px] text-gray-300 truncate block">{fmtLabel(d.label, period)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, change, icon: Icon, color,
}: {
  label: string; value: string; sub?: string; change?: number | null
  icon: React.ElementType; color: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-4 h-4" />
        </div>
        {change !== null && change !== undefined && (
          <span className={cn('text-xs font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-full',
            change >= 0 ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50')}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-xs font-medium text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-300 mt-0.5">{sub}</p>}
    </motion.div>
  )
}

// ─── Leaderboard row ─────────────────────────────────────────────────────────
function LeaderRow({
  item, rank, maxRevenue, total, selected, onSelect, onOffer,
}: {
  item: LeaderboardItem; rank: number; maxRevenue: number; total: number
  selected: boolean; onSelect: () => void; onOffer: () => void
}) {
  const sold    = item.revenue > 0
  const share   = total && sold ? Math.round((item.revenue / total) * 100) : 0
  const bar     = maxRevenue && sold ? (item.revenue / maxRevenue) * 100 : 0
  const medal   = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  const hasOffer = !!item.discountPercent

  return (
    <div className={cn('flex items-center gap-3 py-3 border-b border-gray-50 last:border-0', !sold && 'opacity-60')}>
      {/* Select checkbox */}
      <button onClick={onSelect} className="flex-shrink-0 text-gray-300 hover:text-indigo-500 transition-colors">
        {selected ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4" />}
      </button>

      {/* Rank */}
      <div className="w-6 text-center flex-shrink-0">
        {sold && medal
          ? <span className="text-base">{medal}</span>
          : <span className="text-xs font-bold text-gray-300">#{rank}</span>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <p className={cn('text-sm font-semibold truncate', sold ? 'text-gray-900' : 'text-gray-400')}>{item.name}</p>
            {item.category && (
              <span className="text-[10px] font-medium text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded-full">{item.category}</span>
            )}
            {hasOffer && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{item.discountPercent}% OFF</span>
            )}
            {!item.isAvailable && (
              <span className="text-[10px] font-medium text-amber-400 bg-amber-50 px-1.5 py-0.5 rounded-full">unavailable</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {sold ? (
              <>
                <span className="text-xs text-gray-400">{item.quantity} sold</span>
                {hasOffer
                  ? <span className="text-xs font-bold text-emerald-600">
                      <span className="line-through text-gray-300 font-normal mr-1">₹{item.originalPrice?.toFixed(0)}</span>₹{item.price.toFixed(0)}
                    </span>
                  : <span className="text-xs font-bold text-indigo-600">{fmt(item.revenue)}</span>
                }
                <span className="text-xs font-medium text-gray-300 w-7 text-right">{share}%</span>
              </>
            ) : (
              <span className="text-xs text-gray-300">
                {hasOffer
                  ? <><span className="line-through">₹{item.originalPrice?.toFixed(0)}</span> → ₹{item.price.toFixed(0)}</>
                  : `₹${item.price} · not sold yet`}
              </span>
            )}
            {/* Offer button */}
            <button onClick={onOffer}
              className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors',
                hasOffer
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600')}>
              <Tag className="w-3 h-3" />
              {hasOffer ? 'Edit offer' : 'Offer'}
            </button>
          </div>
        </div>
        <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${bar}%` }}
            transition={{ duration: 0.6, delay: Math.min(rank, 10) * 0.04 }}
            className={cn('h-full rounded-full', rank === 1 ? 'bg-indigo-500' : rank <= 3 ? 'bg-indigo-400' : 'bg-indigo-200')} />
        </div>
        {sold && (
          <p className="text-[10px] text-gray-300 mt-0.5">
            {item.orders} order{item.orders !== 1 ? 's' : ''} · avg ₹{item.quantity ? (item.revenue / item.quantity).toFixed(0) : 0}/unit
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Offer modal ─────────────────────────────────────────────────────────────
function OfferModal({
  items, onClose, onApply, isPending,
}: {
  items: LeaderboardItem[]; onClose: () => void
  onApply: (discount: number) => void; isPending: boolean
}) {
  const [discount, setDiscount] = useState<string>(
    items.length === 1 && items[0].discountPercent ? String(items[0].discountPercent) : ''
  )
  const bulk = items.length > 1
  const hasExisting = items.some((i) => i.discountPercent)

  const presets = [5, 10, 15, 20, 25, 30, 50]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">{bulk ? `Bulk Offer (${items.length} items)` : 'Set Offer'}</h3>
            {!bulk && <p className="text-sm text-gray-400 truncate mt-0.5">{items[0]?.name}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {bulk && (
          <div className="bg-indigo-50 rounded-xl p-3 mb-4 max-h-24 overflow-y-auto">
            {items.map((i) => (
              <p key={i._id} className="text-xs text-indigo-700 font-medium">{i.name}
                {i.discountPercent && <span className="text-indigo-400 ml-1">({i.discountPercent}% active)</span>}
              </p>
            ))}
          </div>
        )}

        {/* Preset buttons */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick pick</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {presets.map((p) => (
            <button key={p} onClick={() => setDiscount(String(p))}
              className={cn('px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                discount === String(p) ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600')}>
              {p}%
            </button>
          ))}
        </div>

        {/* Custom input */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Custom</p>
        <div className="flex items-center gap-2 mb-5">
          <input type="number" min="1" max="100" value={discount} onChange={(e) => setDiscount(e.target.value)}
            placeholder="e.g. 12"
            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
          <span className="text-gray-500 font-semibold">%</span>
        </div>

        <div className="flex gap-2">
          {hasExisting && (
            <button onClick={() => onApply(0)} disabled={isPending}
              className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
              Remove offer
            </button>
          )}
          <button
            onClick={() => { const d = parseInt(discount); if (d >= 1 && d <= 100) onApply(d) }}
            disabled={!discount || parseInt(discount) < 1 || parseInt(discount) > 100 || isPending}
            className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {isPending ? 'Applying…' : `Apply ${discount ? discount + '%' : ''} & Notify`}
          </button>
        </div>
        <p className="text-xs text-gray-300 text-center mt-2">All customers of this restaurant will be notified by email.</p>
      </motion.div>
    </motion.div>
  )
}

// ─── Period selector ─────────────────────────────────────────────────────────
const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'day',   label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom' },
]

// ─── Main component ───────────────────────────────────────────────────────────
// ─── Staff Performance ────────────────────────────────────────────────────────

function StaffPerformance({ period }: { period: AnalyticsPeriod }) {
  const p = period === 'custom' ? 'week' : period
  const { data, isLoading } = useQuery({
    queryKey: ['staff-stats', p],
    queryFn: () => billApi.staffStats(p as 'day' | 'week' | 'month'),
  })

  if (isLoading) return null
  if (!data || data.staff.length === 0) return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4 text-gray-400" />
        <h3 className="font-semibold text-gray-900 text-sm">Staff Performance</h3>
      </div>
      <p className="text-xs text-gray-400 text-center py-6">No staff orders yet. Bills placed by named staff members will appear here.</p>
    </div>
  )

  const top = data.staff[0]

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Staff Performance</h3>
        </div>
        <span className="text-xs text-gray-400">{data.staff.length} staff · {data.totalBills} total bills</span>
      </div>

      <div className="space-y-3">
        {data.staff.map((s, i) => (
          <div key={s.name}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black',
                  i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : 'bg-orange-300 text-white',
                )}>
                  {i + 1}
                </div>
                <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                {s.name === top.name && data.staff.length > 1 && (
                  <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-1.5 py-0.5 rounded-full">Top</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-gray-900">{fmt(s.revenue)}</span>
                <span className="text-xs text-gray-400 ml-2">{s.bills} bill{s.bills !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-indigo-500 rounded-full h-1.5 transition-all"
                style={{ width: `${s.share}%` }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-xs text-gray-400">{s.share}% of all bills</span>
              <span className="text-xs text-gray-400">avg ₹{s.avgBill.toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SalesTab() {
  const queryClient = useQueryClient()

  const [period, setPeriod] = useState<AnalyticsPeriod>('week')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')

  // Offer state
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set())
  const [offerTarget,   setOfferTarget]   = useState<LeaderboardItem | null>(null)
  const [bulkOfferOpen, setBulkOfferOpen] = useState(false)

  const enabled = period !== 'custom' || (!!customFrom && !!customTo)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', period, customFrom, customTo],
    queryFn: () => billApi.analytics(period, customFrom || undefined, customTo || undefined),
    enabled,
    staleTime: 60_000,
  })

  const summary   = data?.summary
  const vouchers  = data?.vouchers
  const reviews   = data?.reviews
  const timeline  = data?.timeline ?? []
  const leaderboard = data?.leaderboard ?? []

  const revChange  = summary ? pct(summary.totalRevenue, summary.prevRevenue) : null
  const billChange = summary ? pct(summary.totalBills,   summary.prevBills)   : null

  const singleOfferMutation = useMutation({
    mutationFn: ({ id, discount }: { id: string; discount: number }) => menuApi.applyOffer(id, discount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setOfferTarget(null)
    },
  })

  const bulkOfferMutation = useMutation({
    mutationFn: ({ ids, discount }: { ids: string[]; discount: number }) => menuApi.bulkApplyOffer(ids, discount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setBulkOfferOpen(false)
      setSelectedIds(new Set())
    },
  })

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const selectedItems = useMemo(() => leaderboard.filter((i) => selectedIds.has(i._id)), [leaderboard, selectedIds])

  const soldItems          = useMemo(() => leaderboard.filter((i) => i.revenue > 0), [leaderboard])
  const totalLeaderRevenue = useMemo(() => soldItems.reduce((s, i) => s + i.revenue, 0), [soldItems])
  const maxLeaderRevenue   = useMemo(() => soldItems[0]?.revenue ?? 1, [soldItems])

  return (
    <div className="space-y-6">

      {/* Period selector */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={cn('px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
                period === p.value
                  ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-700')}>
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              max={customTo || undefined}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              min={customFrom || undefined}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
        )}
      </div>

      {/* Loading / error */}
      {period === 'custom' && !enabled && (
        <div className="py-12 text-center text-gray-400 text-sm">Select a date range to view analytics.</div>
      )}
      {isLoading && enabled && (
        <div className="py-12 text-center text-gray-400 text-sm">Loading analytics…</div>
      )}
      {isError && (
        <div className="py-6 text-center text-red-400 text-sm">Failed to load analytics. Please try again.</div>
      )}

      {data && !isLoading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Revenue" value={fmt(summary!.totalRevenue)}
              sub={summary!.prevRevenue ? `prev: ${fmt(summary!.prevRevenue)}` : undefined}
              change={revChange} icon={TrendingUp} color="bg-indigo-50 text-indigo-600" />
            <StatCard label="Orders" value={String(summary!.totalBills)}
              sub={summary!.prevBills ? `prev: ${summary!.prevBills}` : undefined}
              change={billChange} icon={Receipt} color="bg-violet-50 text-violet-600" />
            <StatCard label="Avg Order Value" value={`₹${summary!.avgOrder.toFixed(0)}`}
              icon={ShoppingBag} color="bg-sky-50 text-sky-600" change={null} />
            <StatCard label="Items Sold" value={String(summary!.totalItems)}
              icon={Package} color="bg-emerald-50 text-emerald-600" change={null} />
          </div>

          {/* Voucher metrics */}
          {vouchers && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-amber-600" />
                <h3 className="font-semibold text-amber-900 text-sm">Voucher Performance</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Issued',        value: vouchers.issued,                          color: 'text-amber-700' },
                  { label: 'Redeemed',      value: vouchers.redeemed,                        color: 'text-green-700' },
                  { label: 'Pending',       value: vouchers.pending,                         color: 'text-gray-600'  },
                  { label: 'Total Discount',value: `₹${vouchers.totalDiscount.toFixed(0)}`, color: 'text-red-600'   },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl p-3 text-center border border-amber-100">
                    <p className={cn('text-xl font-black', color)}>{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                    {label === 'Redeemed' && vouchers.issued > 0 && (
                      <p className="text-[10px] text-green-500 font-medium mt-0.5">{vouchers.redemptionRate}% rate</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review conversion funnel */}
          {reviews && reviews.emailsSent > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">⭐</span>
                <h3 className="font-semibold text-indigo-900 text-sm">Review Funnel</h3>
                <span className={cn(
                  'ml-auto text-xs font-bold px-2.5 py-1 rounded-full',
                  reviews.conversionRate >= 50 ? 'bg-green-100 text-green-700'
                  : reviews.conversionRate >= 25 ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-600',
                )}>
                  {reviews.conversionRate}% conversion
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Emails Sent',  value: reviews.emailsSent, emoji: '📧' },
                  { label: 'Reviews Got',  value: reviews.count,      emoji: '⭐' },
                  { label: 'Conv. Rate',   value: `${reviews.conversionRate}%`, emoji: '📈' },
                ].map(({ label, value, emoji }) => (
                  <div key={label} className="bg-white rounded-xl p-3 text-center border border-indigo-100">
                    <p className="text-base mb-0.5">{emoji}</p>
                    <p className="text-xl font-black text-indigo-700">{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {reviews.conversionRate < 30 && (
                <p className="text-xs text-indigo-500 mt-3 text-center">
                  💡 Tip: A voucher reward boosts conversions to 50%+
                </p>
              )}
            </div>
          )}

          {/* Revenue chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 text-sm">Revenue</h3>
              <span className="text-xs text-gray-400">
                {period === 'day' ? 'Hourly' : period === 'week' ? 'Daily (7d)' : period === 'month' ? 'Daily (30d)' : 'Daily'}
              </span>
            </div>
            {timeline.every((t) => t.revenue === 0) ? (
              <div className="py-12 text-center text-gray-300 text-sm">No revenue data for this period.</div>
            ) : (
              <BarChart data={timeline} period={period} />
            )}
          </div>

          {/* Leaderboard */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Service Leaderboard</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {soldItems.length} sold · {leaderboard.length - soldItems.length} not yet sold
                </p>
              </div>
              <div className="flex items-center gap-2">
                {soldItems.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Revenue tracked</p>
                    <p className="text-sm font-bold text-gray-900">{fmt(totalLeaderRevenue)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bulk offer toolbar — appears when items are selected */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-2.5 mb-4">
                  <span className="text-sm font-semibold text-indigo-700">{selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedIds(new Set())}
                      className="text-xs text-indigo-400 hover:text-indigo-600 px-2 py-1 rounded-lg transition-colors">Clear</button>
                    <button onClick={() => setBulkOfferOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                      <Tag className="w-3 h-3" /> Bulk Offer
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {leaderboard.length === 0 ? (
              <div className="py-10 text-center text-gray-300 text-sm">No services found. Add items to your menu first.</div>
            ) : (
              <div>
                {leaderboard.map((item, i) => (
                  <LeaderRow key={item._id || item.name} item={item} rank={i + 1}
                    maxRevenue={maxLeaderRevenue} total={totalLeaderRevenue}
                    selected={selectedIds.has(item._id)}
                    onSelect={() => item._id && toggleSelect(item._id)}
                    onOffer={() => setOfferTarget(item)} />
                ))}
              </div>
            )}
          </div>

          {/* Offer modals */}
          <AnimatePresence>
            {offerTarget && (
              <OfferModal
                items={[offerTarget]}
                onClose={() => setOfferTarget(null)}
                onApply={(discount) => singleOfferMutation.mutate({ id: offerTarget._id, discount })}
                isPending={singleOfferMutation.isPending}
              />
            )}
            {bulkOfferOpen && (
              <OfferModal
                items={selectedItems}
                onClose={() => setBulkOfferOpen(false)}
                onApply={(discount) => bulkOfferMutation.mutate({ ids: Array.from(selectedIds), discount })}
                isPending={bulkOfferMutation.isPending}
              />
            )}
          </AnimatePresence>

          {/* Staff Performance */}
          <StaffPerformance period={period} />

          {/* Bottom insight strip */}
          {soldItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-indigo-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Top Seller</p>
                <p className="font-bold text-indigo-900 text-sm truncate">{soldItems[0].name}</p>
                <p className="text-xs text-indigo-500 mt-0.5">{soldItems[0].quantity} units · {fmt(soldItems[0].revenue)}</p>
              </div>
              <div className="bg-violet-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-1">Most Ordered</p>
                {(() => {
                  const top = [...soldItems].sort((a, b) => b.orders - a.orders)[0]
                  return <>
                    <p className="font-bold text-violet-900 text-sm truncate">{top.name}</p>
                    <p className="text-xs text-violet-500 mt-0.5">in {top.orders} separate orders</p>
                  </>
                })()}
              </div>
              <div className="bg-emerald-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">Best Unit Value</p>
                {(() => {
                  const top = [...soldItems].sort((a, b) => (b.revenue / b.quantity) - (a.revenue / a.quantity))[0]
                  return <>
                    <p className="font-bold text-emerald-900 text-sm truncate">{top.name}</p>
                    <p className="text-xs text-emerald-500 mt-0.5">₹{(top.revenue / top.quantity).toFixed(0)} avg per unit</p>
                  </>
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
