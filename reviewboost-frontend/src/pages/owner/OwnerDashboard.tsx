import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { QrCode, Star, TrendingUp, BarChart2, ArrowUp, ArrowDown, CheckCircle, AlertCircle, Users, Mail, Gift, Plus, Trash2, MailCheck, X } from 'lucide-react'

import OwnerLayout, { type OwnerTabId } from '@/components/Layout/OwnerLayout'
import { ownerApi } from '@/api/ownerApi'
import QRDisplay from '@/components/QRDisplay/QRDisplay'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatters'
import { BUSINESS_CONFIG } from '@/types/restaurant'
import type { ReviewLog } from '@/types/review'
import type { Customer } from '@/types/customer'
import { getCustomerStatus } from '@/types/customer'

const addCustomerSchema = z.object({
  name:      z.string().min(1, 'Name required'),
  email:     z.string().email('Invalid email'),
  visitDate: z.string().min(1, 'Visit date required'),
  phone:     z.string().optional(),
  notes:     z.string().optional(),
})
type AddCustomerForm = z.infer<typeof addCustomerSchema>

const voucherSchema = z.object({
  isActive:     z.boolean(),
  title:        z.string().min(1, 'Required'),
  discountText: z.string().min(1, 'Required'),
  description:  z.string().optional(),
  code:         z.string().min(1, 'Required'),
  expiryDays:   z.number().min(1).max(365),
})
type VoucherForm = z.infer<typeof voucherSchema>

const profileSchema = z.object({
  name:            z.string().min(2),
  services:        z.string(),
  description:     z.string(),
  googleMapsUrl:   z.string().url().optional().or(z.literal('')),
  googleReviewUrl: z.string().url().optional().or(z.literal('')),
  zomatoUrl:       z.string().url().optional().or(z.literal('')),
  logoColor:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal('')),
})
type ProfileForm = z.infer<typeof profileSchema>

const statColorMap = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-500' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-500'   },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-500'  },
  green:  { bg: 'bg-green-50',  text: 'text-green-500'  },
  red:    { bg: 'bg-red-50',    text: 'text-red-400'    },
}

const submittedToColors: Record<ReviewLog['submittedTo'], string> = {
  google:  'bg-blue-50 text-blue-600',
  zomato:  'bg-red-50 text-red-500',
  private: 'bg-gray-100 text-gray-500',
}

function StarDisplay({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={s <= count ? '#f59e0b' : '#e5e7eb'}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

export default function OwnerDashboard() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<OwnerTabId>('overview')
  const [profileSaved, setProfileSaved] = useState(false)
  const [addCustomerOpen, setAddCustomerOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkCsv, setBulkCsv] = useState('')
  const [bulkResult, setBulkResult] = useState<{ inserted: number; errors: string[] } | null>(null)
  const [voucherSaved, setVoucherSaved] = useState(false)

  const { data: stats } = useQuery({ queryKey: ['owner-stats'], queryFn: ownerApi.getStats })
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({ queryKey: ['owner-reviews'], queryFn: ownerApi.getReviews })
  const { data: profile } = useQuery({ queryKey: ['owner-profile'], queryFn: ownerApi.getProfile })
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => ownerApi.getCustomers(),
    enabled: activeTab === 'customers',
  })
  const { data: voucher } = useQuery({
    queryKey: ['voucher'],
    queryFn: ownerApi.getVoucher,
    enabled: activeTab === 'voucher',
  })

  const updateMutation = useMutation({
    mutationFn: ownerApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-profile'] })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    },
  })

  const addCustomerMutation = useMutation({
    mutationFn: ownerApi.addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setAddCustomerOpen(false)
      customerForm.reset()
    },
  })

  const bulkMutation = useMutation({
    mutationFn: ownerApi.bulkAddCustomers,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setBulkResult(result)
      setBulkCsv('')
    },
  })

  const deleteCustomerMutation = useMutation({
    mutationFn: ownerApi.deleteCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  })

  const upsertVoucherMutation = useMutation({
    mutationFn: ownerApi.upsertVoucher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voucher'] })
      setVoucherSaved(true)
      setTimeout(() => setVoucherSaved(false), 2500)
    },
  })

  const deleteVoucherMutation = useMutation({
    mutationFn: ownerApi.deleteVoucher,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['voucher'] }),
  })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: profile ? {
      name:            profile.name,
      services:        profile.services?.join(', ') ?? '',
      description:     profile.description ?? '',
      googleMapsUrl:   profile.googleMapsUrl ?? '',
      googleReviewUrl: profile.googleReviewUrl ?? '',
      zomatoUrl:       profile.zomatoUrl ?? '',
      logoColor:       profile.logoColor ?? '#6366f1',
    } : undefined,
  })

  const onSaveProfile = (data: ProfileForm) => {
    updateMutation.mutate({
      name:            data.name,
      services:        data.services.split(',').map((s) => s.trim()).filter(Boolean),
      description:     data.description || undefined,
      googleMapsUrl:   data.googleMapsUrl || undefined,
      googleReviewUrl: data.googleReviewUrl || undefined,
      zomatoUrl:       data.zomatoUrl || undefined,
      logoColor:       data.logoColor || undefined,
    })
  }

  const monthDiff = stats
    ? ((stats.thisMonth - stats.lastMonth) / Math.max(stats.lastMonth, 1)) * 100
    : 0

  // Setup checklist
  const setupItems = profile ? [
    { label: 'Add Google write-a-review link', done: !!profile.googleReviewUrl },
    { label: 'Add your services / menu',       done: (profile.services?.length ?? 0) > 0 },
    { label: 'Set brand colour',               done: profile.logoColor !== '#6366f1' },
  ] : []
  const setupComplete = setupItems.every((i) => i.done)

  const businessConfig = profile?.businessType ? BUSINESS_CONFIG[profile.businessType] : null

  const customerForm = useForm<AddCustomerForm>({ resolver: zodResolver(addCustomerSchema) })
  const voucherForm = useForm<VoucherForm>({
    resolver: zodResolver(voucherSchema),
    values: voucher ? {
      isActive:     voucher.isActive,
      title:        voucher.title,
      discountText: voucher.discountText,
      description:  voucher.description ?? '',
      code:         voucher.code,
      expiryDays:   voucher.expiryDays,
    } : { isActive: true, title: '', discountText: '', description: '', code: '', expiryDays: 30 },
  })

  const onSaveVoucher = (data: VoucherForm) => {
    upsertVoucherMutation.mutate({
      isActive:     data.isActive,
      title:        data.title,
      discountText: data.discountText,
      description:  data.description || undefined,
      code:         data.code.toUpperCase(),
      expiryDays:   Number(data.expiryDays),
    })
  }

  const customers: Customer[] = customersData?.data ?? []
  const customerStats = {
    total:   customers.length,
    sent:    customers.filter((c) => c.emailSentAt).length,
    reviewed: customers.filter((c) => c.reviewedAt).length,
  }

  const statCards = [
    { label: 'Total Scans',       value: stats?.totalScans ?? '—',                                             icon: QrCode,    color: 'indigo' as const },
    { label: 'Reviews Generated', value: stats?.reviewsGenerated ?? '—',                                       icon: BarChart2, color: 'blue'   as const },
    { label: 'Avg. Rating',       value: stats?.averageRating ? stats.averageRating.toFixed(1) + ' ★' : '—',  icon: Star,      color: 'amber'  as const },
    {
      label: 'This Month', value: stats?.thisMonth ?? '—', icon: TrendingUp,
      color: monthDiff >= 0 ? 'green' as const : 'red' as const,
      trend: stats ? { value: Math.abs(monthDiff).toFixed(0) + '%', up: monthDiff >= 0 } : undefined,
    },
  ]

  return (
    <OwnerLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-4 sm:p-6 lg:p-8">

        {/* Page heading */}
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight capitalize">
              {activeTab === 'overview' ? 'Dashboard' : activeTab}
            </h1>
            {businessConfig && activeTab === 'overview' && (
              <span className="text-xs font-semibold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
                {businessConfig.label}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {activeTab === 'overview'    && 'Track your review performance'}
            {activeTab === 'reviews'     && 'All reviews collected via ReviewBoost'}
            {activeTab === 'customers'   && 'Email follow-up campaign'}
            {activeTab === 'voucher'     && 'Reward customers after they review'}
            {activeTab === 'profile'     && 'Manage your business details'}
          </p>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">

            {/* Setup nudge — only shown until complete */}
            {!setupComplete && profile && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-800">Complete your setup to go live</span>
                </div>
                <div className="space-y-2">
                  {setupItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <div className={cn('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0', item.done ? 'bg-green-500' : 'bg-amber-200')}>
                        {item.done && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className={item.done ? 'text-gray-400 line-through' : 'text-amber-800'}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setActiveTab('profile')} className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
                  Complete profile →
                </button>
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {statCards.map(({ label, value, icon: Icon, color, trend }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', statColorMap[color].bg)}>
                      <Icon className={cn('w-4 h-4', statColorMap[color].text)} />
                    </div>
                    {trend && (
                      <div className={cn('flex items-center gap-0.5 text-xs font-medium', trend.up ? 'text-green-500' : 'text-red-400')}>
                        {trend.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {trend.value}
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* QR section */}
            {profile?.slug && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <QRDisplay slug={profile.slug} restaurantName={profile.name} />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-semibold text-gray-900 mb-1.5">Your Review QR Code</h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-4">
                      Place this on your counter, table, or receipt. Customers scan and get AI-written review suggestions instantly — no app needed.
                    </p>
                    <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-100 text-gray-400 text-xs font-mono px-3 py-1.5 rounded-lg">
                      {window.location.origin}/r/{profile.slug}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upgrade card */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-indigo-900 text-sm">Upgrade to Pro</h3>
                <p className="text-indigo-400 text-xs mt-0.5">Unlimited reviews, custom branding & advanced analytics.</p>
              </div>
              <button className="shrink-0 bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap">
                View plans
              </button>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {reviewsLoading ? (
              <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
            ) : reviews.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-gray-400 text-sm">No reviews yet.</p>
                <p className="text-gray-300 text-xs mt-1">Share your QR code to get started.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-50">
                        {['Date', 'Stars', 'Review', 'Submitted to', 'Customized?'].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((r) => (
                        <tr key={r._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(r.timestamp)}</td>
                          <td className="px-5 py-4"><StarDisplay count={r.stars} /></td>
                          <td className="px-5 py-4 text-sm text-gray-700 max-w-xs"><p className="truncate">{r.reviewText}</p></td>
                          <td className="px-5 py-4">
                            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full capitalize', submittedToColors[r.submittedTo])}>{r.submittedTo}</span>
                          </td>
                          <td className="px-5 py-4">
                            {r.wasEdited ? <span className="text-xs text-amber-500 font-medium">Yes</span> : <span className="text-xs text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {reviews.map((r) => (
                    <div key={r._id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <StarDisplay count={r.stars} />
                        <span className="text-xs text-gray-400">{formatDate(r.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-3">{r.reviewText}</p>
                      <div className="flex items-center justify-between">
                        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full capitalize', submittedToColors[r.submittedTo])}>{r.submittedTo}</span>
                        {r.wasEdited && <span className="text-xs text-amber-500 font-medium">Customized</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-4">
            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Added',    value: customerStats.total,    icon: Users,     color: 'indigo' as const },
                { label: 'Emailed',  value: customerStats.sent,     icon: Mail,      color: 'blue'   as const },
                { label: 'Reviewed', value: customerStats.reviewed, icon: MailCheck, color: 'green'  as const },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2">
                  <div className={cn('w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center', statColorMap[color].bg)}>
                    <Icon className={cn('w-3.5 h-3.5 sm:w-4 sm:h-4', statColorMap[color].text)} />
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-[11px] sm:text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {/* How it works note */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-700 leading-relaxed">
              <p className="font-semibold mb-1">How email follow-ups work</p>
              <p className="text-indigo-500 text-xs">Add a customer after their visit. 3 hours later, they automatically receive a personalised email asking for a review. The email links directly to your review page with their name pre-tracked.</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setAddCustomerOpen(true)}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Customer
              </button>
              <button
                onClick={() => setBulkOpen(true)}
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Users className="w-4 h-4" /> Bulk Paste
              </button>
            </div>

            {/* Add Customer form slide-in */}
            <AnimatePresence>
              {addCustomerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white border border-gray-100 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Add Customer</h3>
                    <button onClick={() => setAddCustomerOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                  <form onSubmit={customerForm.handleSubmit((d) => addCustomerMutation.mutate(d))} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
                        <input {...customerForm.register('name')} placeholder="Jane Smith" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                        {customerForm.formState.errors.name && <p className="text-red-400 text-xs mt-1">{customerForm.formState.errors.name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Email *</label>
                        <input {...customerForm.register('email')} type="email" placeholder="jane@example.com" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                        {customerForm.formState.errors.email && <p className="text-red-400 text-xs mt-1">{customerForm.formState.errors.email.message}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Visit Date *</label>
                        <input {...customerForm.register('visitDate')} type="datetime-local" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Phone <span className="text-gray-300">(optional)</span></label>
                        <input {...customerForm.register('phone')} placeholder="+44 7700 000000" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addCustomerMutation.isPending}
                      className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
                    >
                      {addCustomerMutation.isPending ? 'Adding…' : 'Add & Schedule Email'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bulk paste */}
            <AnimatePresence>
              {bulkOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white border border-gray-100 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Bulk Paste</h3>
                    <button onClick={() => { setBulkOpen(false); setBulkResult(null) }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">One customer per line: <span className="font-mono bg-gray-50 px-1 rounded">Name, email@example.com</span></p>
                  <textarea
                    value={bulkCsv}
                    onChange={(e) => setBulkCsv(e.target.value)}
                    rows={5}
                    placeholder={"Jane Smith, jane@example.com\nJohn Doe, john@example.com"}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono resize-none transition-all"
                  />
                  {bulkResult && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✓ Added {bulkResult.inserted} customers
                      {bulkResult.errors.length > 0 && <span className="text-amber-500 ml-2">({bulkResult.errors.length} skipped)</span>}
                    </div>
                  )}
                  <button
                    onClick={() => bulkMutation.mutate(bulkCsv)}
                    disabled={!bulkCsv.trim() || bulkMutation.isPending}
                    className="mt-3 w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {bulkMutation.isPending ? 'Importing…' : 'Import All'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Customer list */}
            {customersLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading customers…</div>
            ) : customers.length === 0 ? (
              <div className="py-16 text-center">
                <Mail className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No customers yet.</p>
                <p className="text-gray-300 text-xs mt-1">Add a customer above to start sending follow-up emails.</p>
              </div>
            ) : (
              <>
              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {customers.map((c) => {
                  const status = getCustomerStatus(c)
                  const statusStyle = { reviewed: 'bg-green-50 text-green-600', 'email-sent': 'bg-blue-50 text-blue-600', pending: 'bg-amber-50 text-amber-600' }[status]
                  const statusLabel = { reviewed: 'Reviewed', 'email-sent': 'Email sent', pending: 'Pending' }[status]
                  return (
                    <div key={c._id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0', statusStyle)}>{statusLabel}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{c.email}</p>
                        <p className="text-xs text-gray-300 mt-0.5">{formatDate(c.visitDate)}</p>
                      </div>
                      <button onClick={() => deleteCustomerMutation.mutate(c._id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {['Customer', 'Email', 'Visit Date', 'Status', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => {
                      const status = getCustomerStatus(c)
                      const statusStyle = { reviewed: 'bg-green-50 text-green-600', 'email-sent': 'bg-blue-50 text-blue-600', pending: 'bg-amber-50 text-amber-600' }[status]
                      const statusLabel = { reviewed: 'Reviewed', 'email-sent': 'Email sent', pending: 'Pending' }[status]
                      return (
                        <tr key={c._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-500">{c.email}</td>
                          <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(c.visitDate)}</td>
                          <td className="px-4 py-3.5">
                            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusStyle)}>{statusLabel}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button onClick={() => deleteCustomerMutation.mutate(c._id)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'voucher' && (
          <div className="space-y-4 max-w-lg">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Reward Voucher</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Shown to customers after they submit a review</p>
                </div>
              </div>

              <form onSubmit={voucherForm.handleSubmit(onSaveVoucher)} className="space-y-4">
                {/* Toggle */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Enable voucher</p>
                    <p className="text-xs text-gray-400">Customers see this after completing a review</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" {...voucherForm.register('isActive')} className="sr-only peer" />
                    <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Offer Title *</label>
                    <input {...voucherForm.register('title')} placeholder="10% off your next visit" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                    {voucherForm.formState.errors.title && <p className="text-red-400 text-xs mt-1">{voucherForm.formState.errors.title.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Discount Label *</label>
                    <input {...voucherForm.register('discountText')} placeholder="10% OFF" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Voucher Code *</label>
                    <input {...voucherForm.register('code')} placeholder="THANKS10" className="w-full px-3.5 py-2.5 text-sm font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all uppercase" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Instruction <span className="text-gray-300">(optional)</span></label>
                    <input {...voucherForm.register('description')} placeholder="Show this to the staff on your next visit" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Valid for (days)</label>
                    <input {...voucherForm.register('expiryDays', { valueAsNumber: true })} type="number" min={1} max={365} placeholder="30" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    disabled={upsertVoucherMutation.isPending}
                    className="flex-1 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {voucherSaved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : upsertVoucherMutation.isPending ? 'Saving…' : 'Save Voucher'}
                  </motion.button>
                  {voucher && (
                    <button
                      type="button"
                      onClick={() => deleteVoucherMutation.mutate()}
                      className="px-4 py-3 text-red-400 border border-red-100 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Live preview */}
            {voucherForm.watch('title') && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Preview</p>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Your reward</span>
                  </div>
                  <p className="text-gray-900 font-bold text-lg leading-tight">{voucherForm.watch('title') || 'Offer title'}</p>
                  <p className="text-gray-500 text-sm mt-1">{voucherForm.watch('description') || 'Show this to the staff on your next visit'}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl px-4 py-2">
                      <span className="font-mono font-bold text-amber-700 text-lg tracking-widest">{(voucherForm.watch('code') || 'CODE').toUpperCase()}</span>
                    </div>
                    <span className="text-xs text-gray-400">Valid {voucherForm.watch('expiryDays') || 30} days</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-lg">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Business Profile</h2>
              <form onSubmit={handleSubmit(onSaveProfile)} className="space-y-4">

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Business Name</label>
                  <input {...register('name')} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    {businessConfig ? `${businessConfig.serviceLabel} (comma-separated)` : 'Services (comma-separated)'}
                  </label>
                  <input {...register('services')} placeholder="e.g. Haircut, Colour, Keratin Treatment" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Short Description <span className="text-gray-300">(optional)</span></label>
                  <input {...register('description')} placeholder="Award-winning since 2015…" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Google Write-a-Review URL <span className="text-indigo-400 font-normal">(recommended)</span>
                  </label>
                  <input {...register('googleReviewUrl')} placeholder="https://search.google.com/local/writereview?placeid=…" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                  {errors.googleReviewUrl && <p className="text-red-400 text-xs mt-1">{errors.googleReviewUrl.message}</p>}
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    On Google Maps, find your business → click <span className="font-medium text-gray-500">"Write a review"</span> → copy the URL from your browser's address bar and paste it here. This opens the review form directly for your customers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Google Maps URL <span className="text-gray-300">(fallback)</span></label>
                  <input {...register('googleMapsUrl')} placeholder="https://maps.google.com/…" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                  {errors.googleMapsUrl && <p className="text-red-400 text-xs mt-1">{errors.googleMapsUrl.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Zomato / Other URL <span className="text-gray-300">(optional)</span></label>
                  <input {...register('zomatoUrl')} placeholder="https://zomato.com/…" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Brand Colour</label>
                  <div className="flex gap-2">
                    <input {...register('logoColor')} placeholder="#6366f1" className="flex-1 px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                    <input type="color" {...register('logoColor')} className="w-11 h-11 rounded-xl border border-gray-200 cursor-pointer p-1" />
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={isSubmitting || updateMutation.isPending}
                  className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {profileSaved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : isSubmitting ? 'Saving…' : 'Save Changes'}
                </motion.button>
              </form>
            </div>
          </div>
        )}

      </div>
    </OwnerLayout>
  )
}
