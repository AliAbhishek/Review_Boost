import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Store, Star, ShoppingBag, Receipt, Users,
  UtensilsCrossed, MapPin, Phone, Mail, Globe, Link2,
  Tag, CheckCircle2, XCircle, TrendingUp, Clock,
  Package, Award,
} from 'lucide-react'
import { adminApi } from '@/api/adminApi'
import AdminLayout from '@/components/Layout/AdminLayout'
import { BUSINESS_CONFIG } from '@/types/restaurant'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)

const fmtCurrency = (n: number) =>
  '₹' + fmt(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const statusColors: Record<string, string> = {
  pending:   '#dc2626',
  preparing: '#d97706',
  ready:     '#059669',
  billed:    '#6b7280',
  cancelled: '#6b7280',
}

const starColors = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#22c55e']

function Section({ title, icon: Icon, count, children }: {
  title: string; icon: React.ElementType; count?: number; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Icon className="w-4 h-4 text-violet-400" />
        <h2 className="font-bold text-white text-sm uppercase tracking-widest">{title}</h2>
        {count !== undefined && (
          <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
            {count}
          </span>
        )}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string
}) {
  return (
    <div className="rounded-2xl p-5 relative overflow-hidden glass-dark">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-semibold text-white/35 uppercase tracking-wider">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminRestaurantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-restaurant-overview', id],
    queryFn: () => adminApi.getRestaurantOverview(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-white/30 text-sm">Loading…</div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-400 text-sm">Failed to load restaurant details.</div>
        </div>
      </AdminLayout>
    )
  }

  const { restaurant: r, menuItems, recentOrders, recentBills, recentReviews, staffStats, stats } = data

  const grouped = menuItems.reduce<Record<string, typeof menuItems>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const planColors: Record<string, string> = {
    trial: 'rgba(255,255,255,0.08)',
    basic: 'rgba(59,130,246,0.2)',
    pro:   'rgba(139,92,246,0.2)',
  }
  const planText: Record<string, string> = {
    trial: '#9ca3af', basic: '#60a5fa', pro: '#a78bfa',
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* Back + Header */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="mt-1 w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-all flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Logo + identity */}
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
              style={{
                backgroundColor: r.logoColor,
                boxShadow: `0 8px 32px ${r.logoColor}60`,
                backgroundImage: r.logoUrl ? `url(${r.logoUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!r.logoUrl && r.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-white">{r.name}</h1>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide" style={{ background: planColors[r.plan], color: planText[r.plan] }}>
                  {r.plan}
                </span>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: r.isActive ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.1)', color: r.isActive ? '#34d399' : '#f87171' }}>
                  {r.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                <span className="text-sm text-white/30">/r/{r.slug}</span>
                <span className="text-sm text-white/30">{BUSINESS_CONFIG[r.businessType]?.label ?? r.businessType}</span>
                {r.city && <span className="text-sm text-white/30 flex items-center gap-1"><MapPin className="w-3 h-3" />{r.city}</span>}
                {r.ownerEmail && <span className="text-sm text-white/30 flex items-center gap-1"><Mail className="w-3 h-3" />{r.ownerEmail}</span>}
                {r.ownerPhone && <span className="text-sm text-white/30 flex items-center gap-1"><Phone className="w-3 h-3" />{r.ownerPhone}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Orders"   value={fmt(stats.totalOrders)}   icon={ShoppingBag}  color="#818cf8" />
          <StatCard label="Total Bills"    value={fmt(stats.totalBills)}    icon={Receipt}       color="#34d399" />
          <StatCard label="Revenue"        value={fmtCurrency(stats.totalRevenue)} icon={TrendingUp} color="#fbbf24" />
          <StatCard label="Reviews"        value={fmt(stats.totalReviews)}  icon={Star}          color="#c084fc" />
          <StatCard label="Avg Rating"     value={stats.avgRating > 0 ? `${stats.avgRating}★` : '—'} icon={Award} color="#f97316" />
          <StatCard label="Menu Items"     value={fmt(stats.menuItemCount)} icon={UtensilsCrossed} color="#22d3ee" />
        </div>

        {/* Profile */}
        <Section title="Restaurant Profile" icon={Store}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
            {[
              { label: 'Business Name',   value: r.name },
              { label: 'Business Type',   value: BUSINESS_CONFIG[r.businessType]?.label ?? r.businessType },
              { label: 'Slug',            value: `/r/${r.slug}` },
              { label: 'Plan',            value: r.plan.charAt(0).toUpperCase() + r.plan.slice(1) },
              { label: 'City',            value: r.city },
              { label: 'State',           value: r.state },
              { label: 'Cuisine / Type',  value: r.cuisine },
              { label: 'Owner Email',     value: r.ownerEmail },
              { label: 'Owner Phone',     value: r.ownerPhone },
              { label: 'UPI ID',          value: r.upiId },
              { label: 'Brand Color',     value: r.logoColor },
              { label: 'Created',         value: new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
            ].map(({ label, value }) =>
              value ? (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-0.5">{label}</p>
                  <div className="flex items-center gap-2">
                    {label === 'Brand Color' && (
                      <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: value }} />
                    )}
                    <p className="text-sm text-white/70 font-medium">{value}</p>
                  </div>
                </div>
              ) : null
            )}

            {r.description && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-0.5">Description</p>
                <p className="text-sm text-white/70">{r.description}</p>
              </div>
            )}

            {r.services && r.services.length > 0 && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Services / Offerings</p>
                <div className="flex flex-wrap gap-2">
                  {r.services.map((s) => (
                    <span key={s} className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* URLs */}
          {(r.googleReviewUrl || r.googleMapsUrl || r.zomatoUrl) && (
            <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25">URLs</p>
              {[
                { label: 'Google Write-a-Review', url: r.googleReviewUrl },
                { label: 'Google Maps',           url: r.googleMapsUrl },
                { label: 'Zomato',                url: r.zomatoUrl },
              ].map(({ label, url }) =>
                url ? (
                  <div key={label} className="flex items-center gap-3">
                    <Globe className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                    <span className="text-xs text-white/40 w-36 flex-shrink-0">{label}</span>
                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 truncate">
                      <Link2 className="w-3 h-3 flex-shrink-0" />{url}
                    </a>
                  </div>
                ) : null
              )}
            </div>
          )}

          {/* Tax Config */}
          {r.taxConfig && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-3">Tax Configuration</p>
              <div className="flex flex-wrap gap-3">
                {r.taxConfig.gstEnabled && (
                  <>
                    {!r.taxConfig.useIgst ? (
                      <>
                        <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>CGST {r.taxConfig.cgst}%</span>
                        <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>SGST {r.taxConfig.sgst}%</span>
                      </>
                    ) : (
                      <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>IGST {r.taxConfig.igst}%</span>
                    )}
                  </>
                )}
                {!r.taxConfig.gstEnabled && <span className="text-xs text-white/30">GST disabled</span>}
                {r.taxConfig.serviceChargeEnabled && (
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>Service {r.taxConfig.serviceCharge}%</span>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* Menu Items */}
        <Section title="Menu Items" icon={UtensilsCrossed} count={menuItems.length}>
          {menuItems.length === 0 ? (
            <p className="text-sm text-white/20">No menu items added yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.keys(grouped).sort().map((cat) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-violet-400">{cat}</span>
                    <span className="text-[10px] text-white/20">({grouped[cat].length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {grouped[cat].map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between rounded-xl px-4 py-3"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.isAvailable ? '#34d399' : '#6b7280' }} />
                          <div>
                            <span className="text-sm text-white/80 font-medium">{item.name}</span>
                            {!item.isAvailable && <span className="ml-2 text-[10px] text-white/25">(unavailable)</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {item.discountPercent && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>-{item.discountPercent}%</span>
                          )}
                          <div className="text-right">
                            {item.originalPrice && (
                              <div className="text-[11px] text-white/20 line-through">₹{item.originalPrice}</div>
                            )}
                            <div className="text-sm font-bold text-white/80">₹{item.price}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Recent Orders */}
        <Section title="Recent Orders" icon={Package} count={recentOrders.length}>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-white/20">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-white/25" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['KOT', 'Table', 'Customer', 'Items', 'Amount', 'By', 'Status', 'Time'].map((h) => (
                      <th key={h} className="pb-3 text-left pr-4 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="py-3 pr-4 font-mono text-white/60 font-bold">{o.kotNumber}</td>
                      <td className="py-3 pr-4 text-white/50">{o.tableNumber ?? '—'}</td>
                      <td className="py-3 pr-4">
                        <div className="text-white/70 font-medium">{o.customer.name}</div>
                        <div className="text-[11px] text-white/30">{o.customer.phone ?? o.customer.email ?? ''}</div>
                      </td>
                      <td className="py-3 pr-4 text-white/50">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                      <td className="py-3 pr-4 text-white/70 font-bold">{fmtCurrency(o.subtotal)}</td>
                      <td className="py-3 pr-4 text-white/40 text-xs">{o.staffName ?? o.orderedBy}</td>
                      <td className="py-3 pr-4">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: `${statusColors[o.status]}20`, color: statusColors[o.status] }}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 text-[11px] text-white/30 whitespace-nowrap">
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(o.createdAt)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Recent Bills */}
        <Section title="Recent Bills" icon={Receipt} count={recentBills.length}>
          {recentBills.length === 0 ? (
            <p className="text-sm text-white/20">No bills yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-white/25" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Receipt #', 'Customer', 'Items', 'Subtotal', 'Tax', 'Grand Total', 'Staff', 'Reviewed', 'Time'].map((h) => (
                      <th key={h} className="pb-3 text-left pr-4 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBills.map((b) => (
                    <tr key={b._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td className="py-3 pr-4 font-mono text-white/60 font-bold text-xs">{b.receiptNumber}</td>
                      <td className="py-3 pr-4">
                        <div className="text-white/70 font-medium">{b.customer.name}</div>
                        <div className="text-[11px] text-white/30">{b.customer.phone ?? b.customer.email ?? ''}</div>
                      </td>
                      <td className="py-3 pr-4 text-white/50">{b.items.length}</td>
                      <td className="py-3 pr-4 text-white/60">{fmtCurrency(b.subtotal)}</td>
                      <td className="py-3 pr-4 text-white/40">{fmtCurrency(b.totalTax)}</td>
                      <td className="py-3 pr-4 text-white/80 font-bold">{fmtCurrency(b.grandTotal)}</td>
                      <td className="py-3 pr-4 text-white/40 text-xs">{b.staffName ?? '—'}</td>
                      <td className="py-3 pr-4">
                        {b.reviewedAt
                          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                          : <XCircle className="w-4 h-4 text-white/15" />}
                      </td>
                      <td className="py-3 text-[11px] text-white/30 whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Reviews */}
        <Section title="Reviews" icon={Star} count={recentReviews.length}>
          {recentReviews.length === 0 ? (
            <p className="text-sm text-white/20">No reviews yet.</p>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((rv) => (
                <div
                  key={rv._id}
                  className="rounded-xl px-5 py-4"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className="w-3.5 h-3.5"
                            fill={s <= rv.stars ? starColors[rv.stars - 1] : 'transparent'}
                            style={{ color: s <= rv.stars ? starColors[rv.stars - 1] : 'rgba(255,255,255,0.1)' }}
                          />
                        ))}
                        <span className="text-[11px] px-2 py-0.5 rounded-full ml-1" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                          {rv.submittedTo}
                        </span>
                        {rv.wasEdited && <span className="text-[10px] text-white/25">edited</span>}
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed">{rv.reviewText}</p>
                    </div>
                    <div className="text-[11px] text-white/25 whitespace-nowrap flex-shrink-0">
                      {fmtDate(rv.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Staff Performance */}
        <Section title="Staff Performance" icon={Users} count={staffStats.length}>
          {staffStats.length === 0 ? (
            <p className="text-sm text-white/20">No staff billing data yet.</p>
          ) : (
            <div className="space-y-3">
              {staffStats.map((s, i) => {
                const medals = ['🥇', '🥈', '🥉']
                const totalRev = staffStats.reduce((sum, x) => sum + x.revenue, 0)
                const share = totalRev > 0 ? ((s.revenue / totalRev) * 100).toFixed(1) : '0'
                return (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 rounded-xl px-5 py-3"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span className="text-lg w-6 flex-shrink-0">{medals[i] ?? `#${i + 1}`}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white/80">{s.name}</span>
                        <span className="text-sm font-black text-white">{fmtCurrency(s.revenue)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${share}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[11px] text-white/30">{s.bills} bills</span>
                        <span className="text-[11px] text-white/30">{share}% share</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Section>

      </div>
    </AdminLayout>
  )
}
