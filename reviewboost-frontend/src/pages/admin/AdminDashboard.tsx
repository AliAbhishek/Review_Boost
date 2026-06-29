import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, Copy, QrCode, Edit2, Trash2,
  Store, Star, CreditCard, TrendingUp, X, Check,
  ToggleLeft, ToggleRight, UserPlus,
} from 'lucide-react'

import { adminApi } from '@/api/adminApi'
import AdminLayout from '@/components/Layout/AdminLayout'
import QRDisplay from '@/components/QRDisplay/QRDisplay'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import { cn } from '@/utils/cn'
import { formatShortDate } from '@/utils/formatters'
import { BUSINESS_TYPES, BUSINESS_CONFIG } from '@/types/restaurant'
import type { Restaurant, UpdateRestaurantDto } from '@/types/restaurant'

// ─── Schemas ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:         z.string().min(2, 'Required'),
  businessType: z.enum(BUSINESS_TYPES, { error: 'Select a type' }),
  ownerEmail:   z.string().email('Valid email required'),
})
type CreateForm = z.infer<typeof createSchema>

const editSchema = z.object({
  name:          z.string().min(2, 'Required'),
  services:      z.string(),
  description:   z.string(),
  cuisine:       z.string(),
  city:          z.string(),
  googleMapsUrl:   z.string(),
  googleReviewUrl: z.string(),
  zomatoUrl:       z.string(),
  logoColor:     z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Valid hex color'),
  plan:          z.enum(['trial', 'basic', 'pro']),
  ownerPhone:    z.string(),
})
type EditForm = z.infer<typeof editSchema>

// ─── Constants ───────────────────────────────────────────────────────────────

const planStyles: Record<string, { label: string; className: string }> = {
  trial: { label: 'Trial',  className: 'bg-white/5 text-white/40 border-white/10'          },
  basic: { label: 'Basic',  className: 'bg-blue-500/10 text-blue-400 border-blue-500/20'   },
  pro:   { label: 'Pro',    className: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
}

const STAT_CARDS = [
  { key: 'totalRestaurants', label: 'Businesses',        icon: Store,      color: '#818cf8', glow: 'rgba(99,102,241,0.3)',  prefix: '' },
  { key: 'totalReviews',     label: 'Reviews Generated', icon: Star,       color: '#c084fc', glow: 'rgba(192,132,252,0.3)', prefix: '' },
  { key: 'activePlans',      label: 'Active Plans',      icon: CreditCard, color: '#34d399', glow: 'rgba(52,211,153,0.3)',  prefix: '' },
  { key: 'revenue',          label: 'Revenue',           icon: TrendingUp, color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',  prefix: '₹' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const queryClient = useQueryClient()
  const [search, setSearch]           = useState('')
  const [filterPlan, setFilterPlan]   = useState('all')
  const [showForm, setShowForm]       = useState(false)
  const [editTarget, setEditTarget]   = useState<Restaurant | null>(null)
  const [qrTarget, setQrTarget]       = useState<Restaurant | null>(null)
  const [copiedSlug, setCopiedSlug]   = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null)

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['admin-restaurants'],
    queryFn: adminApi.getRestaurants,
    select: (data) => (Array.isArray(data) ? data : []),
  })
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.getStats })

  const createMutation = useMutation({
    mutationFn: adminApi.createRestaurant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setShowForm(false)
      createForm.reset()
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRestaurantDto }) =>
      adminApi.updateRestaurant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] })
      setShowForm(false)
      setEditTarget(null)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteRestaurant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] }),
  })

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { businessType: 'restaurant' },
  })
  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { logoColor: '#6366f1', plan: 'trial' },
  })

  const openCreate = () => {
    createForm.reset({ businessType: 'restaurant' })
    setEditTarget(null)
    setShowForm(true)
  }

  const openEdit = (r: Restaurant) => {
    editForm.reset({
      name:            r.name,
      services:        r.services?.join(', ') ?? '',
      description:     r.description ?? '',
      cuisine:         r.cuisine ?? '',
      city:            r.city ?? '',
      googleMapsUrl:   r.googleMapsUrl ?? '',
      googleReviewUrl: r.googleReviewUrl ?? '',
      zomatoUrl:       r.zomatoUrl ?? '',
      logoColor:       r.logoColor,
      plan:            r.plan,
      ownerPhone:      r.ownerPhone ?? '',
    })
    setEditTarget(r)
    setShowForm(true)
  }

  const onCreateSubmit = (data: CreateForm) => {
    createMutation.mutate(data)
  }

  const onEditSubmit = (data: EditForm) => {
    if (!editTarget) return
    const payload: UpdateRestaurantDto = {
      name:            data.name,
      services:        data.services.split(',').map((s) => s.trim()).filter(Boolean),
      description:     data.description || undefined,
      cuisine:         data.cuisine || undefined,
      city:            data.city || undefined,
      googleMapsUrl:   data.googleMapsUrl || undefined,
      googleReviewUrl: data.googleReviewUrl || undefined,
      zomatoUrl:       data.zomatoUrl || undefined,
      logoColor:       data.logoColor,
      plan:            data.plan,
      ownerPhone:      data.ownerPhone || undefined,
    }
    updateMutation.mutate({ id: editTarget._id, data: payload })
  }

  const toggleStatus = (r: Restaurant) =>
    updateMutation.mutate({ id: r._id, data: { isActive: !r.isActive } })

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/r/${slug}`)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  const copyInviteLink = async (r: Restaurant) => {
    await navigator.clipboard.writeText(`${window.location.origin}/register?restaurant=${r._id}`)
    setCopiedInvite(r._id)
    setTimeout(() => setCopiedInvite(null), 2000)
  }

  const filtered = restaurants.filter((r) => {
    const q = search.toLowerCase()
    return (
      (r.name.toLowerCase().includes(q) || (r.city ?? '').toLowerCase().includes(q)) &&
      (filterPlan === 'all' || r.plan === filterPlan)
    )
  })

  const statsValues: Record<string, number> = {
    totalRestaurants: stats?.totalRestaurants ?? 0,
    totalReviews:     stats?.totalReviews ?? 0,
    activePlans:      stats?.activePlans ?? 0,
    revenue:          stats?.revenue ?? 0,
  }

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Business Manager</h1>
            <p className="text-sm text-white/30 mt-0.5">Manage all businesses and subscriptions</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white btn-gradient-violet"
          >
            <Plus className="w-4 h-4" />
            Add Business
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, glow, prefix }) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: STAT_CARDS.findIndex((s) => s.key === key) * 0.08 }}
              className="relative rounded-2xl p-5 overflow-hidden glass-dark group hover:scale-[1.02] transition-transform cursor-default"
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
                style={{ boxShadow: `inset 0 0 0 1px ${color}30` }}
              />
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs font-semibold text-white/35 uppercase tracking-wider">{label}</p>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}15`, boxShadow: `0 0 20px ${glow}` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              </div>
              <p className="text-3xl font-black text-white">
                <AnimatedCounter to={statsValues[key]} prefix={prefix} />
              </p>
            </motion.div>
          ))}
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                placeholder="Search businesses…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm text-white/60 cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }}
            >
              {['all', 'trial', 'basic', 'pro'].map((p) => (
                <option key={p} value={p} style={{ background: '#0d0d20' }}>{p === 'all' ? 'All plans' : p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-white/20 text-sm">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Business', 'Type', 'Plan', 'Status', 'Created', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-white/25">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <motion.tr
                      key={r._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="group transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                            style={{ backgroundColor: r.logoColor, boxShadow: `0 4px 12px ${r.logoColor}50` }}
                          >
                            {r.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white/80 text-sm">{r.name}</p>
                            <p className="text-[11px] text-white/25">/r/{r.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[11px] font-semibold text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                          {BUSINESS_CONFIG[r.businessType]?.label ?? r.businessType}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide', planStyles[r.plan]?.className)}>
                          {planStyles[r.plan]?.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => toggleStatus(r)} className="transition-transform hover:scale-110">
                          {r.isActive
                            ? <ToggleRight className="w-6 h-6 text-green-400" style={{ filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.6))' }} />
                            : <ToggleLeft className="w-6 h-6 text-white/20" />}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-sm text-white/30">{formatShortDate(r.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          {[
                            { icon: copiedSlug === r.slug ? Check : Copy,           onClick: () => copyLink(r.slug),     title: 'Copy review link',       color: copiedSlug === r.slug ? '#4ade80' : undefined },
                            { icon: copiedInvite === r._id ? Check : UserPlus,      onClick: () => copyInviteLink(r),    title: 'Copy owner invite link', color: copiedInvite === r._id ? '#4ade80' : '#a78bfa' },
                            { icon: QrCode,  onClick: () => setQrTarget(r),         title: 'View / Download QR code' },
                            { icon: Edit2,   onClick: () => openEdit(r),            title: 'Edit' },
                            { icon: Trash2,  onClick: () => deleteMutation.mutate(r._id), title: 'Delete', danger: true },
                          ].map(({ icon: Icon, onClick, title, color, danger }) => (
                            <button
                              key={title}
                              onClick={onClick}
                              title={title}
                              className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                                danger ? 'text-white/20 hover:text-red-400 hover:bg-red-500/10' : 'text-white/20 hover:text-white/70 hover:bg-white/8',
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" style={color ? { color } : undefined} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-white/20 text-sm">No businesses found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {/* Create / Edit slide-over */}
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden"
              style={{ background: '#08081a', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <h2 className="font-black text-white text-lg">{editTarget ? 'Edit Business' : 'New Business'}</h2>
                  {!editTarget && <p className="text-xs text-white/30 mt-0.5">3 fields — under 30 seconds</p>}
                </div>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!editTarget ? (
                /* ── Create form: 3 fields only ── */
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
                  <DarkField label="Business Name" error={createForm.formState.errors.name?.message}>
                    <input {...createForm.register('name')} placeholder="Glow Salon, City Clinic…" className="input-dark" />
                  </DarkField>

                  <DarkField label="Business Type" error={createForm.formState.errors.businessType?.message}>
                    <select {...createForm.register('businessType')} className="input-dark cursor-pointer" style={{ colorScheme: 'dark' }}>
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t} value={t} style={{ background: '#0d0d20' }}>{BUSINESS_CONFIG[t].label}</option>
                      ))}
                    </select>
                  </DarkField>

                  <DarkField label="Owner Email" error={createForm.formState.errors.ownerEmail?.message}>
                    <input {...createForm.register('ownerEmail')} type="email" placeholder="owner@business.com" className="input-dark" />
                  </DarkField>

                  <p className="text-xs text-white/20 pt-1">
                    An invite email will be sent. The owner completes their profile after signing in.
                  </p>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/50 hover:text-white/80 transition-colors" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      Cancel
                    </button>
                    <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={createMutation.isPending} className="flex-1 py-3 rounded-xl text-sm font-bold text-white btn-gradient-violet disabled:opacity-50">
                      {createMutation.isPending ? 'Creating…' : 'Create & Send Invite'}
                    </motion.button>
                  </div>
                </form>
              ) : (
                /* ── Edit form: all detail fields ── */
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                  <DarkField label="Business Name" error={editForm.formState.errors.name?.message}>
                    <input {...editForm.register('name')} className="input-dark" />
                  </DarkField>

                  <DarkField label="Services / Offerings (comma-separated)" error={editForm.formState.errors.services?.message}>
                    <input {...editForm.register('services')} placeholder="Haircut, Colour, Keratin…" className="input-dark" />
                  </DarkField>

                  <DarkField label="Short Description (optional)" error={editForm.formState.errors.description?.message}>
                    <input {...editForm.register('description')} placeholder="Award-winning salon since 2015" className="input-dark" />
                  </DarkField>

                  <DarkField label="Google Write-a-Review URL" error={editForm.formState.errors.googleReviewUrl?.message}>
                    <input {...editForm.register('googleReviewUrl')} placeholder="https://search.google.com/local/writereview?placeid=…" className="input-dark" />
                  </DarkField>

                  <DarkField label="Google Maps URL (fallback)" error={editForm.formState.errors.googleMapsUrl?.message}>
                    <input {...editForm.register('googleMapsUrl')} placeholder="https://maps.google.com/…" className="input-dark" />
                  </DarkField>

                  <DarkField label="Zomato / Other URL (optional)" error={editForm.formState.errors.zomatoUrl?.message}>
                    <input {...editForm.register('zomatoUrl')} placeholder="https://zomato.com/…" className="input-dark" />
                  </DarkField>

                  {[
                    { name: 'city'      as const, label: 'City',        placeholder: 'Mumbai' },
                    { name: 'cuisine'   as const, label: 'Cuisine / Speciality (optional)', placeholder: 'North Indian' },
                    { name: 'ownerPhone'as const, label: 'Owner Phone',  placeholder: '+91 98765 43210' },
                  ].map(({ name, label, placeholder }) => (
                    <DarkField key={name} label={label} error={editForm.formState.errors[name]?.message}>
                      <input {...editForm.register(name)} placeholder={placeholder} className="input-dark" />
                    </DarkField>
                  ))}

                  <div className="grid grid-cols-2 gap-4">
                    <DarkField label="Brand Color" error={editForm.formState.errors.logoColor?.message}>
                      <div className="flex gap-2">
                        <input {...editForm.register('logoColor')} placeholder="#6366f1" className="input-dark flex-1 min-w-0" />
                        <input type="color" {...editForm.register('logoColor')} className="w-11 h-11 rounded-xl border cursor-pointer flex-shrink-0 p-1" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }} />
                      </div>
                    </DarkField>
                    <DarkField label="Plan" error={editForm.formState.errors.plan?.message}>
                      <select {...editForm.register('plan')} className="input-dark cursor-pointer" style={{ colorScheme: 'dark' }}>
                        {(['trial', 'basic', 'pro'] as const).map((p) => (
                          <option key={p} value={p} style={{ background: '#0d0d20' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                        ))}
                      </select>
                    </DarkField>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/50 hover:text-white/80 transition-colors" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      Cancel
                    </button>
                    <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={updateMutation.isPending} className="flex-1 py-3 rounded-xl text-sm font-bold text-white btn-gradient-violet disabled:opacity-50">
                      {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                    </motion.button>
                  </div>
                </form>
              )}
            </motion.div>
          </>
        )}

        {/* QR Modal */}
        {qrTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setQrTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="rounded-3xl p-8 w-full max-w-xs glass-dark" style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-white">QR Code</h3>
                  <button onClick={() => setQrTarget(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/5 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <QRDisplay slug={qrTarget.slug} restaurantName={qrTarget.name} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminLayout>
  )
}

function DarkField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-white/35 mb-1.5 uppercase tracking-widest">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
