import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { QrCode, Star, TrendingUp, BarChart2, ArrowUp, ArrowDown, CheckCircle, AlertCircle, Users, Mail, Gift, Plus, Trash2, MailCheck, X, UtensilsCrossed, Receipt, Pencil, Printer, ShoppingCart, Search, Smartphone, Wifi, WifiOff } from 'lucide-react'

import OwnerLayout, { type OwnerTabId } from '@/components/Layout/OwnerLayout'
import { SalesTab } from '@/components/owner/SalesTab'
import { ownerApi } from '@/api/ownerApi'
import { menuApi } from '@/api/menuApi'
import { billApi } from '@/api/billApi'
import { whatsappApi } from '@/api/whatsappApi'
import QRDisplay from '@/components/QRDisplay/QRDisplay'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatters'
import { BUSINESS_CONFIG } from '@/types/restaurant'
import type { ReviewLog } from '@/types/review'
import type { Customer } from '@/types/customer'
import { getCustomerStatus } from '@/types/customer'
import type { MenuItem } from '@/types/menu'
import type { Bill, CartItem } from '@/types/bill'
import type { VoucherValidation } from '@/types/voucher'

const addCustomerSchema = z.object({
  name:         z.string().min(1, 'Name required'),
  email:        z.string().email('Invalid email'),
  visitDate:    z.string().min(1, 'Visit date required'),
  phone:        z.string().optional(),
  orderedItems: z.string().optional(),
  notes:        z.string().optional(),
})
type AddCustomerForm = z.infer<typeof addCustomerSchema>

const voucherSchema = z.object({
  isActive:        z.boolean(),
  title:           z.string().min(1, 'Required'),
  discountText:    z.string().min(1, 'Required'),
  description:     z.string().optional(),
  code:            z.string().min(1, 'Required'),
  discountPercent: z.number().min(1).max(100),
  expiryDays:      z.number().min(1).max(365),
})
type VoucherForm = z.infer<typeof voucherSchema>

const menuItemSchema = z.object({
  name:        z.string().min(1, 'Name required'),
  category:    z.string().optional(),
  price:       z.number().min(0, 'Price required'),
  isAvailable: z.boolean().optional(),
})
type MenuItemForm = z.infer<typeof menuItemSchema>

const taxConfigSchema = z.object({
  gstEnabled:           z.boolean(),
  cgst:                 z.number().min(0).max(50),
  sgst:                 z.number().min(0).max(50),
  useIgst:              z.boolean(),
  igst:                 z.number().min(0).max(50),
  serviceChargeEnabled: z.boolean(),
  serviceCharge:        z.number().min(0).max(50),
})
type TaxConfigForm = z.infer<typeof taxConfigSchema>

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

function TableQrSection({ slug }: { slug: string }) {
  const [tableNum, setTableNum] = useState('1')
  const origin = window.location.origin
  const url = slug ? `${origin}/table/${slug}/${tableNum}` : ''

  function printTableQR() {
    const w = window.open('', '_blank')!
    w.document.write(`<!DOCTYPE html><html><head><title>Table ${tableNum} Order QR</title>
<style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
.card{background:#fff;border-radius:20px;padding:32px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:320px;}
h2{font-size:22px;font-weight:900;margin:0 0 4px;} p{color:#6b7280;font-size:13px;margin:0 0 20px;}
.table-badge{background:#6366f1;color:#fff;border-radius:20px;padding:6px 20px;font-size:18px;font-weight:900;display:inline-block;margin-bottom:20px;}
img{width:200px;height:200px;border-radius:12px;}</style></head>
<body onload="window.print()"><div class="card">
<span class="table-badge">Table ${tableNum}</span>
<h2>Order Here</h2><p>Scan to browse menu and order</p>
<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" />
<p style="margin-top:12px;font-size:11px;color:#9ca3af;">${url}</p>
</div></body></html>`)
    w.document.close()
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <span className="text-sm text-gray-600 font-medium">Table #</span>
        <input
          value={tableNum}
          onChange={(e) => setTableNum(e.target.value.replace(/\D/g, '') || '1')}
          className="w-16 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-center font-mono"
        />
        <button
          onClick={printTableQR}
          disabled={!slug}
          className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          🖨 Print Table QR
        </button>
      </div>
      {url && <p className="text-xs text-gray-400 font-mono break-all">{url}</p>}
      <p className="text-xs text-gray-400">Print one QR per table. Customers scan → browse menu → place order → kitchen gets it instantly.</p>
    </div>
  )
}

function UpiIdField() {
  const qc = useQueryClient()
  const { data: profile } = useQuery({ queryKey: ['owner-profile'], queryFn: ownerApi.getProfile })
  const [value, setValue] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (profile?.upiId !== undefined) setValue(profile.upiId ?? '') }, [profile])

  const mutation = useMutation({
    mutationFn: (upiId: string) => ownerApi.updateProfile({ upiId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['owner-profile'] }); setSaved(true); setTimeout(() => setSaved(false), 2500) },
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false) }}
          placeholder="yourname@upi or 9876543210@paytm"
          className="flex-1 px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 font-mono"
        />
        <button
          onClick={() => mutation.mutate(value)}
          disabled={mutation.isPending || !value.trim()}
          className="px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {saved ? '✓ Saved' : mutation.isPending ? '…' : 'Save'}
        </button>
      </div>
      <p className="text-xs text-gray-400">When set, a UPI QR code is embedded in every receipt email so customers can scan and pay instantly.</p>
    </div>
  )
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

  // Menu state
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [menuSearch, setMenuSearch] = useState('')
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false)
  const [bulkMenuCsv, setBulkMenuCsv] = useState('')
  const [bulkMenuResult, setBulkMenuResult] = useState<{ inserted: number; errors: string[] } | null>(null)

  // Billing / POS state
  const [cart, setCart] = useState<CartItem[]>([])
  const [posSearch, setPosSearch] = useState('')
  const [billCustomer, setBillCustomer] = useState({ name: '', email: '', phone: '' })
  const [generatedBill, setGeneratedBill] = useState<Bill | null>(null)
  const [billSearch, setBillSearch] = useState('')
  const [voucherCodeInput, setVoucherCodeInput] = useState('')
  const [voucherValidation, setVoucherValidation] = useState<VoucherValidation | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [voucherValidating, setVoucherValidating] = useState(false)
  const receiptRef = useRef<HTMLDivElement>(null)
  const menuFileRef = useRef<HTMLInputElement>(null)
  const customerFileRef = useRef<HTMLInputElement>(null)

  const readCsvFile = (file: File, setter: (v: string) => void) => {
    const reader = new FileReader()
    reader.onload = (e) => setter((e.target?.result as string) ?? '')
    reader.readAsText(file)
  }

  useEffect(() => {
    const code = voucherCodeInput.trim().toUpperCase()
    if (!code || code.length < 6) { setVoucherValidation(null); setVoucherError(null); return }
    const timer = setTimeout(async () => {
      setVoucherValidating(true)
      try {
        const result = await billApi.validateVoucher(code)
        setVoucherValidation(result)
        setVoucherError(null)
      } catch {
        setVoucherValidation(null)
        setVoucherError('Invalid or expired voucher')
      } finally {
        setVoucherValidating(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [voucherCodeInput])

  // Customer 360
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

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

  const { data: menuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ['menu'],
    queryFn: menuApi.list,
    enabled: activeTab === 'menu' || activeTab === 'billing',
  })

  const { data: billsData, isLoading: billsLoading } = useQuery({
    queryKey: ['bills'],
    queryFn: () => billApi.list(),
    enabled: activeTab === 'billing',
  })

  const logoUploadMutation = useMutation({
    mutationFn: ownerApi.uploadLogo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['owner-profile'] }),
  })
  const logoDeleteMutation = useMutation({
    mutationFn: ownerApi.deleteLogo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['owner-profile'] }),
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

  const { data: customerDetail, isLoading: customerDetailLoading } = useQuery({
    queryKey: ['customer-detail', selectedCustomerId],
    queryFn: () => ownerApi.getCustomer(selectedCustomerId!),
    enabled: !!selectedCustomerId,
  })

  const [pinInput, setPinInput] = useState('')
  const [pinSaved, setPinSaved] = useState(false)
  const [qrDownloading, setQrDownloading] = useState(false)

  const { data: reviewQR } = useQuery({
    queryKey: ['review-qr'],
    queryFn: ownerApi.getReviewQR,
    enabled: activeTab === 'profile',
    staleTime: Infinity,
  })

  const setBillingPinMutation = useMutation({
    mutationFn: (pin: string) => ownerApi.setBillingPin(pin),
    onSuccess: () => { setPinInput(''); setPinSaved(true); setTimeout(() => setPinSaved(false), 2500) },
  })
  const removeBillingPinMutation = useMutation({
    mutationFn: ownerApi.removeBillingPin,
    onSuccess: () => { setPinInput('') },
  })

  const downloadQR = () => {
    if (!reviewQR?.qrDataUrl) return
    setQrDownloading(true)
    const link = document.createElement('a')
    link.href = reviewQR.qrDataUrl
    link.download = `${profile?.slug ?? 'review'}-qr.png`
    link.click()
    setTimeout(() => setQrDownloading(false), 1000)
  }

  const printQR = () => {
    if (!reviewQR) return
    const w = window.open('', '_blank', 'width=480,height=640')
    if (!w) return
    w.document.write(`<!DOCTYPE html>
<html>
<head><title>Review QR — ${reviewQR.restaurantName}</title>
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:32px;}
.logo{width:64px;height:64px;border-radius:18px;object-fit:cover;margin-bottom:16px;}
.avatar{width:64px;height:64px;border-radius:18px;background:${profile?.logoColor ?? '#6366f1'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:900;margin-bottom:16px;}
h1{margin:0 0 6px;font-size:24px;font-weight:900;color:#111827;text-align:center;}
p{margin:0 0 24px;font-size:14px;color:#6b7280;text-align:center;}
img.qr{width:240px;height:240px;border-radius:12px;border:1px solid #e5e7eb;}
.cta{margin-top:20px;font-size:17px;font-weight:800;color:#111827;text-align:center;}
.sub{font-size:13px;color:#9ca3af;margin-top:4px;text-align:center;}
@media print{body{padding:0;}}</style></head>
<body>
${profile?.logoUrl ? `<img class="logo" src="${profile.logoUrl}" alt="${reviewQR.restaurantName}" />` : `<div class="avatar">${reviewQR.restaurantName[0]}</div>`}
<h1>${reviewQR.restaurantName}</h1>
<p>Scan to share your feedback</p>
<img class="qr" src="${reviewQR.qrDataUrl}" alt="QR Code" />
<div class="cta">⭐⭐⭐⭐⭐</div>
<div class="sub">Takes 30 seconds · We'd love to hear from you!</div>
<script>window.onload=()=>{window.print();window.close()}<\/script>
</body></html>`)
    w.document.close()
  }

  const { data: waStatus, refetch: refetchWA } = useQuery({
    queryKey: ['wa-status'],
    queryFn: whatsappApi.getStatus,
    enabled: activeTab === 'profile',
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'connecting' ? 3000 : false
    },
  })
  const waConnectMutation = useMutation({
    mutationFn: whatsappApi.connect,
    onSuccess: () => { void refetchWA() },
  })
  const waDisconnectMutation = useMutation({
    mutationFn: whatsappApi.disconnect,
    onSuccess: () => { void refetchWA() },
  })

  const addMenuItemMutation = useMutation({
    mutationFn: menuApi.add,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menu'] }); setAddMenuOpen(false); menuItemForm.reset() },
  })
  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItemForm> }) => menuApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menu'] }); setEditingItem(null) },
  })
  const deleteMenuItemMutation = useMutation({
    mutationFn: menuApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu'] }),
  })
  const bulkMenuMutation = useMutation({
    mutationFn: menuApi.bulkAdd,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['menu'] })
      setBulkMenuResult(result)
      setBulkMenuCsv('')
    },
  })

  const sendReviewMutation = useMutation({
    mutationFn: ({ customerId, billId }: { customerId: string; billId?: string }) =>
      ownerApi.sendReviewForBill(customerId, billId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customer-detail', selectedCustomerId] }),
  })

  const createBillMutation = useMutation({
    mutationFn: billApi.create,
    onSuccess: (bill) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setGeneratedBill(bill)
      setCart([])
      setBillCustomer({ name: '', email: '', phone: '' })
      setVoucherCodeInput('')
      setVoucherValidation(null)
    },
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
  const menuItemForm = useForm<MenuItemForm>({ resolver: zodResolver(menuItemSchema), defaultValues: { category: 'Main', isAvailable: true } })
  const taxForm = useForm<TaxConfigForm>({
    resolver: zodResolver(taxConfigSchema),
    values: profile?.taxConfig ? {
      gstEnabled:           profile.taxConfig.gstEnabled,
      cgst:                 profile.taxConfig.cgst,
      sgst:                 profile.taxConfig.sgst,
      useIgst:              profile.taxConfig.useIgst,
      igst:                 profile.taxConfig.igst,
      serviceChargeEnabled: profile.taxConfig.serviceChargeEnabled,
      serviceCharge:        profile.taxConfig.serviceCharge,
    } : { gstEnabled: false, cgst: 2.5, sgst: 2.5, useIgst: false, igst: 5, serviceChargeEnabled: false, serviceCharge: 10 },
  })
  const voucherForm = useForm<VoucherForm>({
    resolver: zodResolver(voucherSchema),
    values: voucher ? {
      isActive:        voucher.isActive,
      title:           voucher.title,
      discountText:    voucher.discountText,
      description:     voucher.description ?? '',
      code:            voucher.code,
      discountPercent: voucher.discountPercent ?? 10,
      expiryDays:      voucher.expiryDays,
    } : { isActive: true, title: '', discountText: '', description: '', code: '', discountPercent: 10, expiryDays: 30 },
  })

  const onSaveVoucher = (data: VoucherForm) => {
    upsertVoucherMutation.mutate({
      isActive:        data.isActive,
      title:           data.title,
      discountText:    data.discountText,
      description:     data.description || undefined,
      code:            data.code.toUpperCase(),
      discountPercent: Number(data.discountPercent),
      expiryDays:      Number(data.expiryDays),
    })
  }

  // Cart helpers
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id)
      if (existing) return prev.map((c) => c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }]
    })
  }
  const updateQty = (menuItemId: string, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((c) => c.menuItemId !== menuItemId))
    else setCart((prev) => prev.map((c) => c.menuItemId === menuItemId ? { ...c, quantity: qty } : c))
  }
  const updatePrice = (menuItemId: string, price: number) => {
    setCart((prev) => prev.map((c) => c.menuItemId === menuItemId ? { ...c, price: isNaN(price) ? c.price : Math.max(0, price) } : c))
  }
  const cartSubtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const filteredCustomers = (customers: Customer[]) =>
    customerSearch.trim()
      ? customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.email.toLowerCase().includes(customerSearch.toLowerCase()))
      : customers

  const onSaveTaxConfig = (data: TaxConfigForm) => {
    updateMutation.mutate({ taxConfig: data } as Parameters<typeof updateMutation.mutate>[0])
  }

  const handleGenerateBill = () => {
    if (!billCustomer.name.trim() || cart.length === 0) return
    createBillMutation.mutate({
      customer: { name: billCustomer.name, email: billCustomer.email || undefined, phone: billCustomer.phone || undefined },
      items: cart.map((c) => ({ name: c.name, price: c.price, quantity: c.quantity })),
      voucherCode: voucherValidation ? voucherCodeInput.trim().toUpperCase() : undefined,
    })
  }

  const handlePrintReceipt = () => window.print()

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
            {activeTab === 'sales'       && 'Revenue, orders and top-selling items'}
            {activeTab === 'billing'     && 'Create bills and manage receipts'}
            {activeTab === 'menu'        && 'Manage your menu items and prices'}
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

        {activeTab === 'menu' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setEditingItem(null); setAddMenuOpen(true) }}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" /> Add Item
              </button>
              <button onClick={() => { setBulkMenuOpen(true); setBulkMenuResult(null) }}
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <UtensilsCrossed className="w-4 h-4" /> Bulk Upload
              </button>
            </div>

            {/* Bulk upload panel */}
            <AnimatePresence>
              {bulkMenuOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">Bulk Upload Menu</h3>
                    <button onClick={() => { setBulkMenuOpen(false); setBulkMenuResult(null) }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    One item per line. Formats supported:<br />
                    <span className="font-mono bg-gray-50 px-1 rounded">Dal Makhani, Main Course, 250</span> or <span className="font-mono bg-gray-50 px-1 rounded">Lassi, 80</span>
                  </p>

                  {/* File upload */}
                  <input ref={menuFileRef} type="file" accept=".csv,.txt" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) readCsvFile(f, setBulkMenuCsv); e.target.value = '' }} />
                  <button onClick={() => menuFileRef.current?.click()}
                    className="w-full mb-2 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload CSV file
                  </button>
                  <p className="text-center text-xs text-gray-300 mb-2">— or paste below —</p>

                  <textarea value={bulkMenuCsv} onChange={(e) => setBulkMenuCsv(e.target.value)} rows={6}
                    placeholder={"Dal Makhani, Main Course, 250\nButter Naan, Breads, 40\nLassi, Drinks, 80\nGulab Jamun, Desserts, 60"}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono resize-none transition-all" />
                  {bulkMenuResult && (
                    <div className="mt-2 text-xs font-medium">
                      <span className="text-green-600">✓ Added {bulkMenuResult.inserted} items</span>
                      {bulkMenuResult.errors.length > 0 && <span className="text-amber-500 ml-2">({bulkMenuResult.errors.length} skipped)</span>}
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => bulkMenuMutation.mutate(bulkMenuCsv)} disabled={!bulkMenuCsv.trim() || bulkMenuMutation.isPending}
                      className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      {bulkMenuMutation.isPending ? 'Importing…' : 'Import All'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <input value={menuSearch} onChange={(e) => setMenuSearch(e.target.value)} placeholder="Search items…"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
            </div>

            <AnimatePresence>
              {addMenuOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Add Menu Item</h3>
                    <button onClick={() => setAddMenuOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                  <form onSubmit={menuItemForm.handleSubmit((d) => addMenuItemMutation.mutate(d))} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Item Name *</label>
                        <input {...menuItemForm.register('name')} placeholder="Dal Makhani" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                        {menuItemForm.formState.errors.name && <p className="text-red-400 text-xs mt-1">{menuItemForm.formState.errors.name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                        <input {...menuItemForm.register('category')} placeholder="Main Course" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Price (₹) *</label>
                        <input {...menuItemForm.register('price', { valueAsNumber: true })} type="number" min="0" step="0.01" placeholder="250" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                        {menuItemForm.formState.errors.price && <p className="text-red-400 text-xs mt-1">{menuItemForm.formState.errors.price.message}</p>}
                      </div>
                    </div>
                    <button type="submit" disabled={addMenuItemMutation.isPending}
                      className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60">
                      {addMenuItemMutation.isPending ? 'Adding…' : 'Add Item'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {menuLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading menu…</div>
            ) : menuItems.length === 0 ? (
              <div className="py-16 text-center">
                <UtensilsCrossed className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No menu items yet.</p>
                <p className="text-gray-300 text-xs mt-1">Add items to start billing customers.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {Object.entries(
                  menuItems
                    .filter((i) => !menuSearch || i.name.toLowerCase().includes(menuSearch.toLowerCase()) || i.category.toLowerCase().includes(menuSearch.toLowerCase()))
                    .reduce<Record<string, MenuItem[]>>((acc, item) => {
                      const cat = item.category || 'Main'
                      acc[cat] = [...(acc[cat] ?? []), item]
                      return acc
                    }, {})
                ).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{category}</span>
                    </div>
                    {items.map((item) => (
                      <div key={item._id} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        {editingItem?._id === item._id ? (
                          <div className="flex-1 flex gap-2">
                            <input defaultValue={item.name} id={`name-${item._id}`}
                              className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                            <input defaultValue={item.price} type="number" id={`price-${item._id}`}
                              className="w-24 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                            <button onClick={() => {
                              const nameEl = document.getElementById(`name-${item._id}`) as HTMLInputElement
                              const priceEl = document.getElementById(`price-${item._id}`) as HTMLInputElement
                              updateMenuItemMutation.mutate({ id: item._id, data: { name: nameEl.value, price: Number(priceEl.value) } })
                            }} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg">Save</button>
                            <button onClick={() => setEditingItem(null)} className="px-3 py-1.5 text-gray-400 text-xs border border-gray-200 rounded-lg">Cancel</button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-400">₹{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditingItem(item)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteMenuItemMutation.mutate(item._id)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sales' && <SalesTab />}

        {activeTab === 'billing' && (
          <div className="space-y-4">
            {generatedBill ? (
              <div className="space-y-4">
                <div ref={receiptRef} className="bg-white rounded-2xl border border-gray-100 p-6 max-w-sm mx-auto print:shadow-none print:border-none">
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-black text-gray-900">{profile?.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Receipt {generatedBill.receiptNumber}</p>
                    <p className="text-xs text-gray-400">{formatDate(generatedBill.createdAt)}</p>
                  </div>
                  <div className="border-t border-dashed border-gray-200 my-3" />
                  <p className="text-sm font-semibold text-gray-900 mb-2">{generatedBill.customer.name}</p>
                  {generatedBill.customer.email && <p className="text-xs text-gray-400 mb-3">{generatedBill.customer.email}</p>}
                  <div className="space-y-1.5 mb-3">
                    {generatedBill.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.name} × {item.quantity}</span>
                        <span className="text-gray-900 font-medium">₹{item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Subtotal</span><span>₹{generatedBill.subtotal.toFixed(2)}</span>
                    </div>
                    {generatedBill.taxLines.map((t, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-400">
                        <span>{t.label}</span><span>₹{t.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {generatedBill.voucherApplied && (
                      <div className="flex justify-between text-xs text-green-600 font-semibold">
                        <span>Voucher {generatedBill.voucherApplied.code} ({generatedBill.voucherApplied.discountPercent}%)</span>
                        <span>-₹{generatedBill.voucherApplied.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-gray-900 pt-1 border-t border-gray-100">
                      <span>Total</span><span>₹{generatedBill.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t border-dashed border-gray-200 mt-4 pt-3 text-center">
                    <p className="text-xs text-gray-400">Thank you for visiting!</p>
                    {generatedBill.customer.email && (
                      <p className="text-xs text-green-500 mt-1">Receipt & review link sent to email</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 max-w-sm mx-auto">
                  <button onClick={handlePrintReceipt} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button onClick={() => setGeneratedBill(null)} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                    New Bill
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Left — menu + cart */}
                <div className="space-y-4">
                  {/* Customer info */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Customer Details</h3>
                    <div className="space-y-2">
                      <input value={billCustomer.name} onChange={(e) => setBillCustomer((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Customer name *" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                      <input value={billCustomer.email} onChange={(e) => setBillCustomer((p) => ({ ...p, email: e.target.value }))}
                        placeholder="Email (for receipt + review)" type="email" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                      <input value={billCustomer.phone} onChange={(e) => setBillCustomer((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="Phone (optional)" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                      <div className="relative">
                        <input
                          value={voucherCodeInput}
                          onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                          placeholder="Voucher code (e.g. THANKS10-A3F9)"
                          className={cn(
                            'w-full px-3 py-2.5 text-sm font-mono border rounded-xl focus:outline-none focus:ring-2 transition-all uppercase',
                            voucherValidation ? 'border-green-300 bg-green-50 focus:ring-green-500/30' :
                            voucherError      ? 'border-red-300  bg-red-50  focus:ring-red-500/30'   :
                                                'border-gray-200 focus:ring-indigo-500/30',
                          )}
                        />
                        {voucherValidating && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Checking…</span>}
                        {voucherValidation && (
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {voucherValidation.discountPercent}% off for {voucherValidation.customerName}
                          </div>
                        )}
                        {voucherError && <p className="mt-1 text-xs text-red-500">{voucherError}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Menu search */}
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input value={posSearch} onChange={(e) => setPosSearch(e.target.value)}
                        placeholder="Search menu…" className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                    </div>
                    {menuItems.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-4">Add items in the Menu tab first</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                        {menuItems
                          .filter((i) => i.isAvailable && (!posSearch || i.name.toLowerCase().includes(posSearch.toLowerCase())))
                          .map((item) => (
                            <button key={item._id} onClick={() => addToCart(item)}
                              className="text-left p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all active:scale-95">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                              <p className="text-xs text-indigo-600 font-semibold mt-0.5">₹{item.price.toFixed(2)}</p>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right — order summary */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <ShoppingCart className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-900 text-sm">Order Summary</h3>
                    {cart.length > 0 && (
                      <button onClick={() => setCart([])} className="ml-auto text-xs text-red-400 hover:text-red-500">Clear</button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                      <ShoppingCart className="w-8 h-8 text-gray-200 mb-2" />
                      <p className="text-sm text-gray-400">No items added yet</p>
                      <p className="text-xs text-gray-300 mt-0.5">Tap items on the left to add</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <div className="space-y-2 flex-1">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-2 pb-1 border-b border-gray-50">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Item</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-center">Qty</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-right">Price ✏</span>
                        </div>
                        {cart.map((item) => (
                          <div key={item.menuItemId} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateQty(item.menuItemId, item.quantity - 1)}
                                className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold flex items-center justify-center active:scale-95">−</button>
                              <span className="w-6 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                              <button onClick={() => updateQty(item.menuItemId, item.quantity + 1)}
                                className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold flex items-center justify-center active:scale-95">+</button>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs text-gray-400">₹</span>
                              <input
                                type="number" min="0" step="0.5"
                                value={item.price}
                                onChange={(e) => updatePrice(item.menuItemId, parseFloat(e.target.value))}
                                className="w-16 text-sm font-semibold text-gray-900 text-right border-b border-dashed border-gray-300 focus:border-indigo-400 focus:outline-none bg-transparent"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-gray-100 mt-4 pt-4 space-y-1">
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Subtotal</span><span>₹{cartSubtotal.toFixed(2)}</span>
                        </div>
                        {profile?.taxConfig?.gstEnabled && (
                          profile.taxConfig.useIgst
                            ? <div className="flex justify-between text-xs text-gray-400"><span>IGST {profile.taxConfig.igst}%</span><span>₹{(cartSubtotal * profile.taxConfig.igst / 100).toFixed(2)}</span></div>
                            : <>
                                <div className="flex justify-between text-xs text-gray-400"><span>CGST {profile.taxConfig.cgst}%</span><span>₹{(cartSubtotal * profile.taxConfig.cgst / 100).toFixed(2)}</span></div>
                                <div className="flex justify-between text-xs text-gray-400"><span>SGST {profile.taxConfig.sgst}%</span><span>₹{(cartSubtotal * profile.taxConfig.sgst / 100).toFixed(2)}</span></div>
                              </>
                        )}
                        {profile?.taxConfig?.serviceChargeEnabled && (
                          <div className="flex justify-between text-xs text-gray-400"><span>Service Charge {profile.taxConfig.serviceCharge}%</span><span>₹{(cartSubtotal * profile.taxConfig.serviceCharge / 100).toFixed(2)}</span></div>
                        )}
                        {voucherValidation && (() => {
                          const preVoucher = cartSubtotal + (profile?.taxConfig?.gstEnabled ? (profile.taxConfig.useIgst ? cartSubtotal * profile.taxConfig.igst / 100 : cartSubtotal * (profile.taxConfig.cgst + profile.taxConfig.sgst) / 100) : 0) + (profile?.taxConfig?.serviceChargeEnabled ? cartSubtotal * profile.taxConfig.serviceCharge / 100 : 0)
                          const disc = preVoucher * voucherValidation.discountPercent / 100
                          return (
                            <div className="flex justify-between text-xs text-green-600 font-semibold">
                              <span>Voucher ({voucherValidation.discountPercent}% off)</span>
                              <span>-₹{disc.toFixed(2)}</span>
                            </div>
                          )
                        })()}
                        <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-100">
                          <span>Total</span>
                          <span>₹{(() => {
                            const pre = cartSubtotal + (profile?.taxConfig?.gstEnabled ? (profile.taxConfig.useIgst ? cartSubtotal * profile.taxConfig.igst / 100 : cartSubtotal * (profile.taxConfig.cgst + profile.taxConfig.sgst) / 100) : 0) + (profile?.taxConfig?.serviceChargeEnabled ? cartSubtotal * profile.taxConfig.serviceCharge / 100 : 0)
                            const disc = voucherValidation ? pre * voucherValidation.discountPercent / 100 : 0
                            return (pre - disc).toFixed(2)
                          })()}</span>
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateBill}
                        disabled={!billCustomer.name.trim() || cart.length === 0 || createBillMutation.isPending}
                        className="mt-4 w-full py-4 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 lg:py-3.5"
                      >
                        <Receipt className="w-4 h-4" />
                        {createBillMutation.isPending ? 'Generating…' : `Generate Bill${cart.length > 0 ? ` — ₹${(() => {
                          const pre = cartSubtotal + (profile?.taxConfig?.gstEnabled ? (profile.taxConfig.useIgst ? cartSubtotal * profile.taxConfig.igst / 100 : cartSubtotal * (profile.taxConfig.cgst + profile.taxConfig.sgst) / 100) : 0) + (profile?.taxConfig?.serviceChargeEnabled ? cartSubtotal * profile.taxConfig.serviceCharge / 100 : 0)
                          const disc = voucherValidation ? pre * voucherValidation.discountPercent / 100 : 0
                          return (pre - disc).toFixed(0)
                        })()}` : ''}`}
                      </button>
                      {!billCustomer.name.trim() && <p className="text-xs text-amber-500 text-center mt-1.5">Enter customer name to proceed</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bills history */}
            {!generatedBill && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">Recent Bills</h3>
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                    <input value={billSearch} onChange={(e) => setBillSearch(e.target.value)} placeholder="Search bills…"
                      className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                  </div>
                </div>
                {billsLoading ? (
                  <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
                ) : !billsData?.data?.length ? (
                  <div className="py-8 text-center text-gray-400 text-sm">No bills yet.</div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-50">
                          {['Receipt', 'Customer', 'Items', 'Total', 'Date'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {billsData.data
                          .filter((b) => !billSearch || b.customer.name.toLowerCase().includes(billSearch.toLowerCase()) || b.receiptNumber.includes(billSearch))
                          .map((bill) => (
                            <tr key={bill._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3.5 text-sm font-mono font-semibold text-indigo-600">{bill.receiptNumber}</td>
                              <td className="px-4 py-3.5 text-sm text-gray-900">{bill.customer.name}</td>
                              <td className="px-4 py-3.5 text-xs text-gray-400">{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</td>
                              <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">₹{bill.grandTotal.toFixed(2)}</td>
                              <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(bill.createdAt)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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

            {/* Actions + Search */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setAddCustomerOpen(true)}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                <Plus className="w-4 h-4" /> Add Customer
              </button>
              <button onClick={() => setBulkOpen(true)}
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                <Users className="w-4 h-4" /> Bulk Paste
              </button>
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search by name or email…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
              </div>
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
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">What they ordered <span className="text-gray-300">(optional — AI uses this in the review)</span></label>
                      <input {...customerForm.register('orderedItems')} placeholder="e.g. Dal Makhani, Butter Naan, Lassi" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
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
                  <p className="text-xs text-gray-400 mb-3">
                    One customer per line:<br />
                    <span className="font-mono bg-gray-50 px-1 rounded">Name, email@example.com</span> or <span className="font-mono bg-gray-50 px-1 rounded">Name, email@example.com, 9876543210</span>
                  </p>

                  {/* File upload */}
                  <input ref={customerFileRef} type="file" accept=".csv,.txt" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) readCsvFile(f, setBulkCsv); e.target.value = '' }} />
                  <button onClick={() => customerFileRef.current?.click()}
                    className="w-full mb-2 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Upload CSV file
                  </button>
                  <p className="text-center text-xs text-gray-300 mb-2">— or paste below —</p>

                  <textarea
                    value={bulkCsv}
                    onChange={(e) => setBulkCsv(e.target.value)}
                    rows={5}
                    placeholder={"Jane Smith, jane@example.com, 9876543210\nJohn Doe, john@example.com"}
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

            {/* Customer 360 slide-out */}
            <AnimatePresence>
              {selectedCustomerId && (
                <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
                  className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-y-auto">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h2 className="font-bold text-gray-900">Customer Profile</h2>
                    <button onClick={() => setSelectedCustomerId(null)} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {customerDetailLoading ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
                  ) : customerDetail ? (
                    <div className="p-6 space-y-6">
                      {/* Customer info */}
                      <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5">
                        <p className="text-lg font-bold text-gray-900">{customerDetail.customer.name}</p>
                        <p className="text-sm text-gray-500">{customerDetail.customer.email}</p>
                        {customerDetail.customer.phone && <p className="text-sm text-gray-400">{customerDetail.customer.phone}</p>}
                        <div className="flex items-center gap-2 pt-1">
                          {customerDetail.customer.reviewedAt
                            ? <span className="text-xs font-semibold bg-green-50 text-green-600 px-2.5 py-1 rounded-full">Has reviewed</span>
                            : <span className="text-xs font-semibold bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full">No review yet</span>
                          }
                          {customerDetail.customer.emailSentAt && (
                            <span className="text-xs text-gray-400">Last email {formatDate(customerDetail.customer.emailSentAt)}</span>
                          )}
                        </div>
                      </div>

                      {/* Bills */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3 text-sm">Order History ({customerDetail.bills.length})</h3>
                        {customerDetail.bills.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">No bills found for this customer.</p>
                        ) : (
                          <div className="space-y-3">
                            {customerDetail.bills.map((bill) => (
                              <div key={bill._id} className="bg-white border border-gray-100 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-bold text-indigo-600">{bill.receiptNumber}</span>
                                    {bill.reviewedAt
                                      ? <span className="text-[10px] font-semibold bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Reviewed</span>
                                      : <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Not reviewed</span>
                                    }
                                  </div>
                                  <span className="text-xs text-gray-400">{formatDate(bill.createdAt)}</span>
                                </div>
                                <div className="space-y-0.5 mb-3">
                                  {bill.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                      <span className="text-gray-600">{item.name} × {item.quantity}</span>
                                      <span className="text-gray-900">₹{item.subtotal.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                  <div>
                                    <span className="text-sm font-bold text-gray-900">₹{bill.grandTotal.toFixed(2)}</span>
                                    {bill.voucherApplied && (
                                      <p className="text-[10px] text-green-600 font-semibold mt-0.5">
                                        Voucher {bill.voucherApplied.code} (-₹{bill.voucherApplied.discountAmount.toFixed(2)})
                                      </p>
                                    )}
                                  </div>
                                  {!bill.reviewedAt && (
                                    <button
                                      onClick={() => sendReviewMutation.mutate({ customerId: selectedCustomerId!, billId: bill._id })}
                                      disabled={sendReviewMutation.isPending}
                                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                      Send review link
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
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
                {filteredCustomers(customers).map((c) => {
                  const status = getCustomerStatus(c)
                  const statusStyle = { reviewed: 'bg-green-50 text-green-600', 'email-sent': 'bg-blue-50 text-blue-600', pending: 'bg-amber-50 text-amber-600' }[status]
                  const statusLabel = { reviewed: 'Reviewed', 'email-sent': 'Email sent', pending: 'Pending' }[status]
                  return (
                    <div key={c._id} onClick={() => setSelectedCustomerId(c._id)} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:border-indigo-200 transition-colors">
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
                    {filteredCustomers(customers).map((c) => {
                      const status = getCustomerStatus(c)
                      const statusStyle = { reviewed: 'bg-green-50 text-green-600', 'email-sent': 'bg-blue-50 text-blue-600', pending: 'bg-amber-50 text-amber-600' }[status]
                      const statusLabel = { reviewed: 'Reviewed', 'email-sent': 'Email sent', pending: 'Pending' }[status]
                      return (
                        <tr key={c._id} onClick={() => setSelectedCustomerId(c._id)}
                          className="border-b border-gray-50 last:border-0 hover:bg-indigo-50/30 cursor-pointer transition-colors">
                          <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{c.name}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-500">{c.email}</td>
                          <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(c.visitDate)}</td>
                          <td className="px-4 py-3.5">
                            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', statusStyle)}>{statusLabel}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button onClick={(e) => { e.stopPropagation(); deleteCustomerMutation.mutate(c._id) }}
                              className="text-gray-300 hover:text-red-400 transition-colors">
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
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Discount % <span className="text-gray-300">(auto-applied at billing)</span></label>
                    <input {...voucherForm.register('discountPercent', { valueAsNumber: true })} type="number" min={1} max={100} placeholder="10" className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300 transition-all" />
                    {voucherForm.formState.errors.discountPercent && <p className="text-red-400 text-xs mt-1">{voucherForm.formState.errors.discountPercent.message}</p>}
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

                {/* Logo upload — outside form submit, handled separately */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Business Logo</label>
                  {profile?.logoUrl ? (
                    <div className="flex items-center gap-3">
                      <img src={profile.logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-gray-100" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-2">Logo uploaded — shown on review page & emails.</p>
                        <div className="flex gap-2">
                          <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                            Replace
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const f = e.target.files?.[0]
                              if (f) logoUploadMutation.mutate(f)
                            }} />
                          </label>
                          <button
                            type="button"
                            onClick={() => logoDeleteMutation.mutate()}
                            disabled={logoDeleteMutation.isPending}
                            className="text-xs font-semibold text-red-400 hover:text-red-500 border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className={cn(
                      'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors',
                      logoUploadMutation.isPending ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50',
                    )}>
                      {logoUploadMutation.isPending ? (
                        <>
                          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-indigo-500 font-medium">Uploading…</span>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xl font-bold">+</div>
                          <div className="text-center">
                            <p className="text-xs font-semibold text-gray-600">Click to upload logo</p>
                            <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP · max 5 MB</p>
                          </div>
                        </>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) logoUploadMutation.mutate(f)
                      }} />
                    </label>
                  )}
                  {logoUploadMutation.isError && (
                    <p className="text-red-400 text-xs mt-1.5">Upload failed — check file type and size.</p>
                  )}
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

            {/* WhatsApp Integration */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">WhatsApp Notifications</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Link your WhatsApp to send messages alongside every email</p>
                </div>
              </div>

              {/* Status banner */}
              <div className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 mb-5',
                waStatus?.status === 'connected'    ? 'bg-green-50 border border-green-100' :
                waStatus?.status === 'connecting'   ? 'bg-amber-50 border border-amber-100' :
                                                      'bg-gray-50  border border-gray-100',
              )}>
                {waStatus?.status === 'connected'
                  ? <Wifi className="w-4 h-4 text-green-600 flex-shrink-0" />
                  : <WifiOff className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {waStatus?.status === 'connected'  ? 'Connected'              :
                     waStatus?.status === 'connecting' ? 'Waiting for QR scan…'  :
                                                         'Not connected'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {waStatus?.status === 'connected'
                      ? 'Review requests, receipts & vouchers will also go via WhatsApp'
                      : 'Scan the QR code with your WhatsApp to link your number'}
                  </p>
                </div>
                {waStatus?.status === 'connected'
                  ? (
                    <button
                      onClick={() => waDisconnectMutation.mutate()}
                      disabled={waDisconnectMutation.isPending}
                      className="text-xs font-semibold text-red-400 hover:text-red-500 border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => waConnectMutation.mutate()}
                      disabled={waConnectMutation.isPending || waStatus?.status === 'connecting'}
                      className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {waConnectMutation.isPending ? 'Starting…' : waStatus?.status === 'connecting' ? 'Connecting…' : 'Connect'}
                    </button>
                  )
                }
              </div>

              {/* QR code */}
              <AnimatePresence>
                {waStatus?.status === 'connecting' && waStatus.qrDataUrl && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 py-4">
                    <p className="text-xs text-gray-500 text-center">Open WhatsApp → Linked Devices → Link a Device → scan this code</p>
                    <img src={waStatus.qrDataUrl} alt="WhatsApp QR" className="w-48 h-48 rounded-xl border border-gray-100" />
                    <p className="text-[11px] text-gray-400">QR refreshes automatically every 20 seconds</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* What gets sent */}
              {waStatus?.status !== 'connected' && (
                <div className="space-y-2 mt-1">
                  {[
                    { icon: '🧾', label: 'Bill receipt + review link — sent instantly after billing' },
                    { icon: '📝', label: 'Review request — sent 3 hours after visit' },
                    { icon: '🎁', label: 'Voucher code — sent after customer submits review' },
                    { icon: '🔥', label: 'Offer alerts — sent when you apply a discount' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-start gap-2.5 text-xs text-gray-500">
                      <span className="mt-0.5">{icon}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review QR Code */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Review QR Code</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Print and place on tables — customers scan to rate instantly</p>
                </div>
              </div>
              {reviewQR ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <img src={reviewQR.qrDataUrl} alt="Review QR" className="w-48 h-48 rounded-xl" />
                  </div>
                  <p className="text-xs text-gray-400 text-center break-all font-mono">{reviewQR.reviewUrl}</p>
                  <div className="flex gap-2 w-full">
                    <button onClick={downloadQR} disabled={qrDownloading}
                      className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
                      {qrDownloading ? 'Downloading…' : '⬇ Download PNG'}
                    </button>
                    <button onClick={printQR}
                      className="flex-1 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
                      🖨 Print Card
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 text-center">The print version includes your logo, business name, and a star graphic — ready to laminate and place on the table.</p>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 text-sm">Loading QR…</div>
              )}
            </div>

            {/* Table Self-Order QR */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Table Self-Order QR</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Customers scan at the table to order directly — no waiter needed</p>
                </div>
              </div>
              <TableQrSection slug={profile?.slug ?? ''} />
            </div>

            {/* Staff Billing PIN */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <span className="text-amber-600 text-base">🔐</span>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Staff Billing PIN</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Set a PIN so cashiers can create bills without full dashboard access</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Staff visit <span className="font-mono font-medium text-indigo-600">{window.location.origin}/staff</span> and enter your restaurant slug + this PIN. They get a billing-only view — no customers, analytics, or settings.
              </p>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit PIN"
                    maxLength={6}
                    className="flex-1 px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  />
                  <button
                    onClick={() => { if (/^\d{6}$/.test(pinInput)) setBillingPinMutation.mutate(pinInput) }}
                    disabled={!/^\d{6}$/.test(pinInput) || setBillingPinMutation.isPending}
                    className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {pinSaved ? '✓ Saved' : setBillingPinMutation.isPending ? '…' : 'Set PIN'}
                  </button>
                </div>
                <button
                  onClick={() => { if (confirm('Remove the billing PIN? Staff will no longer be able to log in.')) removeBillingPinMutation.mutate() }}
                  disabled={removeBillingPinMutation.isPending}
                  className="text-xs text-red-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  Remove PIN (disable staff access)
                </button>
              </div>
            </div>

            {/* UPI Payment ID */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <span className="text-green-600 text-base">📱</span>
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">UPI Payment ID</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Customers can scan a QR in the receipt email to pay instantly</p>
                </div>
              </div>
              <UpiIdField />
            </div>

            {/* Tax Config */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Tax & Charges</h2>
              <p className="text-xs text-gray-400 mb-5">Configure GST and service charge applied to every bill</p>
              <form onSubmit={taxForm.handleSubmit(onSaveTaxConfig)} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Enable GST</p>
                    <p className="text-xs text-gray-400">Apply CGST + SGST (or IGST) to bills</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" {...taxForm.register('gstEnabled')} className="sr-only peer" />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>

                {taxForm.watch('gstEnabled') && (
                  <div className="space-y-3 pl-4 border-l-2 border-indigo-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">Use IGST (inter-state)</p>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" {...taxForm.register('useIgst')} className="sr-only peer" />
                        <div className="w-8 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                      </label>
                    </div>
                    {taxForm.watch('useIgst') ? (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">IGST %</label>
                        <input {...taxForm.register('igst', { valueAsNumber: true })} type="number" step="0.5" min="0" max="50" className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">CGST %</label>
                          <input {...taxForm.register('cgst', { valueAsNumber: true })} type="number" step="0.5" min="0" max="50" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">SGST %</label>
                          <input {...taxForm.register('sgst', { valueAsNumber: true })} type="number" step="0.5" min="0" max="50" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Service Charge</p>
                    <p className="text-xs text-gray-400">Fixed % on every bill (not a tax)</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" {...taxForm.register('serviceChargeEnabled')} className="sr-only peer" />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>
                {taxForm.watch('serviceChargeEnabled') && (
                  <div className="pl-4 border-l-2 border-indigo-100">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Service Charge %</label>
                    <input {...taxForm.register('serviceCharge', { valueAsNumber: true })} type="number" step="0.5" min="0" max="50" className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
                  </div>
                )}

                <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={updateMutation.isPending}
                  className="w-full py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {profileSaved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : 'Save Tax Config'}
                </motion.button>
              </form>
            </div>
          </div>
        )}

      </div>
    </OwnerLayout>
  )
}
