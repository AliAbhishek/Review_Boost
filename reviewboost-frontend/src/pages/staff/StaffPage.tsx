import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Delete, LogOut, Receipt, ShoppingCart, Search, ChefHat, Clock, Bell } from 'lucide-react'
import { staffApi, staffClient, setStaffToken, clearStaffToken, type StaffRestaurant } from '@/api/staffApi'
import { orderApi, type Order, type OrderStatus } from '@/api/orderApi'
import { useOrderSocket } from '@/hooks/useOrderSocket'
import { cn } from '@/utils/cn'
import type { MenuItem } from '@/types/menu'
import type { Bill, CartItem } from '@/types/bill'
import type { VoucherValidation } from '@/types/voucher'

function playBell() {
  try {
    const ctx = new AudioContext()
    const notes = [660, 990]
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 1)
      gain.gain.setValueAtTime(i === 0 ? 0.7 : 0.35, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + 1.5)
      osc.onended = () => { if (i === notes.length - 1) ctx.close() }
    })
  } catch { /* AudioContext unavailable */ }
}

const ORDER_STATUS: Record<string, { label: string; bg: string; border: string; text: string }> = {
  pending:   { label: 'Pending',   bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  preparing: { label: 'Preparing', bg: '#fffbeb', border: '#fcd34d', text: '#d97706' },
  ready:     { label: '🔔 Ready',  bg: '#ecfdf5', border: '#6ee7b7', text: '#059669' },
  billed:    { label: 'Billed ✓',  bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' },
  cancelled: { label: 'Cancelled', bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' },
}

// ─── PIN Login ────────────────────────────────────────────────────────────────

function PinLogin({ onLogin }: { onLogin: (restaurant: StaffRestaurant, staffName: string) => void }) {
  const [slug, setSlug] = useState('')
  const [staffName, setStaffName] = useState('')
  const [pin, setPin] = useState('')
  const [stage, setStage] = useState<'slug' | 'name' | 'pin'>('slug')
  const [error, setError] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: () => staffApi.login(slug.trim().toLowerCase(), pin, staffName.trim()),
    onSuccess: ({ token, restaurant }) => {
      setStaffToken(token)
      onLogin(restaurant, staffName.trim())
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Incorrect PIN')
      setPin('')
    },
  })

  const appendDigit = (d: string) => {
    if (pin.length < 6) setPin((p) => p + d)
  }
  const deleteDigit = () => setPin((p) => p.slice(0, -1))

  useEffect(() => {
    if (pin.length === 6 && staffName.trim()) {
      loginMutation.mutate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs"
      >
        <div className="text-center mb-8">
          <div className="text-3xl font-black text-white mb-1">ReviewBoost ⚡</div>
          <p className="text-gray-500 text-sm">Staff Billing Access</p>
        </div>

        {stage === 'slug' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Restaurant</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="yourrestaurant"
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-600 mt-1.5">The slug from your restaurant's review link</p>
            </div>
            <button
              onClick={() => { if (slug.trim()) { setStage('name'); setError(null) } }}
              disabled={!slug.trim()}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl disabled:opacity-40 transition-all active:scale-95"
            >
              Continue →
            </button>
          </div>
        ) : stage === 'name' ? (
          <div className="space-y-4">
            <button onClick={() => { setStage('slug') }} className="text-xs text-gray-500 mb-1 flex items-center gap-1 hover:text-gray-300 transition-colors">
              ← {slug}
            </button>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Your Name</label>
              <input
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="e.g. Rahul, Priya…"
                autoFocus
                className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-600 mt-1.5">So the owner can track orders per staff member</p>
            </div>
            <button
              onClick={() => { if (staffName.trim()) { setStage('pin'); setError(null) } }}
              disabled={!staffName.trim()}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl disabled:opacity-40 transition-all active:scale-95"
            >
              Continue →
            </button>
          </div>
        ) : (
          <div>
            <button onClick={() => { setStage('name'); setPin('') }} className="text-xs text-gray-500 mb-5 flex items-center gap-1 hover:text-gray-300 transition-colors">
              ← {staffName}
            </button>

            <p className="text-center text-white font-semibold mb-2">Enter your PIN</p>
            <div className="flex justify-center gap-3 mb-6">
              {[0,1,2,3,4,5].map((i) => (
                <div key={i} className={cn(
                  'w-3 h-3 rounded-full border-2 transition-all',
                  i < pin.length ? 'bg-indigo-500 border-indigo-500 scale-110' : 'bg-transparent border-gray-600',
                )} />
              ))}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-red-400 text-sm mb-4"
              >
                {error}
              </motion.p>
            )}

            <div className="grid grid-cols-3 gap-3">
              {digits.map((d, i) => {
                if (d === '') return <div key={i} />
                if (d === '⌫') {
                  return (
                    <button key={i} onClick={deleteDigit}
                      className="py-4 rounded-2xl bg-gray-800 text-gray-300 font-bold text-xl flex items-center justify-center active:scale-95 transition-transform">
                      <Delete className="w-5 h-5" />
                    </button>
                  )
                }
                return (
                  <button key={i} onClick={() => appendDigit(d)}
                    disabled={loginMutation.isPending}
                    className="py-4 rounded-2xl bg-gray-800 text-white font-bold text-xl active:scale-95 active:bg-gray-700 transition-all">
                    {d}
                  </button>
                )
              })}
            </div>

            {loginMutation.isPending && (
              <p className="text-center text-indigo-400 text-xs mt-4">Verifying…</p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Waiter Order Panel ───────────────────────────────────────────────────────

function WaiterOrderPanel({ myOrders, restaurantId, staffName }: {
  myOrders: Order[]
  restaurantId: string
  staffName: string
}) {
  const qc = useQueryClient()

  // Billing flow state
  const [billingOrder, setBillingOrder] = useState<Order | null>(null)
  const [billCustomer, setBillCustomer] = useState({ name: '', email: '', phone: '' })
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherValidation, setVoucherValidation] = useState<VoucherValidation | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [generatedBill, setGeneratedBill] = useState<Bill | null>(null)

  // Voucher live validation
  useEffect(() => {
    const code = voucherCode.trim().toUpperCase()
    if (!code || code.length < 4) { setVoucherValidation(null); setVoucherError(null); return }
    const t = setTimeout(async () => {
      try {
        const result = await staffClient.get(`/api/bills/validate-voucher?code=${code}`).then((r) => r.data.data)
        setVoucherValidation(result)
        setVoucherError(null)
      } catch {
        setVoucherValidation(null)
        setVoucherError('Invalid or expired voucher')
      }
    }, 500)
    return () => clearTimeout(t)
  }, [voucherCode])

  const billMutation = useMutation({
    mutationFn: async (order: Order) => {
      const hasContact = !!(billCustomer.email.trim() || billCustomer.phone.trim())
      if (!hasContact) throw new Error('Enter phone or email')
      const bill = await staffClient
        .post('/api/bills', {
          customer: {
            name:  billCustomer.name.trim(),
            email: billCustomer.email.trim() || undefined,
            phone: billCustomer.phone.trim() || undefined,
          },
          items: order.items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity })),
          voucherCode: voucherValidation ? voucherCode.trim().toUpperCase() : undefined,
        })
        .then((r) => r.data.data.bill as Bill)
      // Mark the order as billed in parallel
      await orderApi.updateStatus(order._id, 'billed')
      return bill
    },
    onSuccess: (bill, order) => {
      qc.setQueryData<Order[]>(['waiter-orders', restaurantId, staffName], (prev = []) =>
        prev.map((o) => o._id === order._id ? { ...o, status: 'billed' as OrderStatus } : o)
      )
      setGeneratedBill(bill)
      setBillingOrder(null)
    },
  })

  function openBilling(order: Order) {
    setBillingOrder(order)
    setBillCustomer({
      name:  order.customer.name,
      email: order.customer.email  ?? '',
      phone: order.customer.phone  ?? '',
    })
    setVoucherCode('')
    setVoucherValidation(null)
    setVoucherError(null)
    setGeneratedBill(null)
  }

  // ── Receipt view ────────────────────────────────────────────────────────────
  if (generatedBill) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-black text-gray-900">Bill Generated!</p>
            <p className="text-xs text-gray-400 mt-0.5">{generatedBill.receiptNumber}</p>
          </div>
          <div className="border-t border-dashed border-gray-100 pt-3">
            <p className="text-sm font-semibold text-gray-800 mb-2">{generatedBill.customer.name}</p>
            <div className="space-y-1 mb-2">
              {generatedBill.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-700">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-medium">₹{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            {generatedBill.taxLines.map((t, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-400">
                <span>{t.label}</span><span>₹{t.amount.toFixed(2)}</span>
              </div>
            ))}
            {generatedBill.voucherApplied && (
              <div className="flex justify-between text-xs text-green-600 font-semibold mt-1">
                <span>Voucher ({generatedBill.voucherApplied.discountPercent}% off)</span>
                <span>-₹{generatedBill.voucherApplied.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-100 mt-2">
              <span>Total</span><span>₹{generatedBill.grandTotal.toFixed(2)}</span>
            </div>
          </div>
          {generatedBill.customer.email && (
            <p className="text-xs text-green-500 text-center">Receipt & review link sent to email ✓</p>
          )}
          {generatedBill.customer.phone && !generatedBill.customer.email && (
            <p className="text-xs text-green-500 text-center">Receipt sent via WhatsApp ✓</p>
          )}
          <button
            onClick={() => setGeneratedBill(null)}
            className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-indigo-600 active:scale-[0.98] transition-all"
          >
            Back to My Orders
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Billing form ────────────────────────────────────────────────────────────
  if (billingOrder) {
    const orderTotal = billingOrder.items.reduce((s, i) => s + i.subtotal, 0)
    const hasContact = !!(billCustomer.email.trim() || billCustomer.phone.trim())
    return (
      <div className="p-4 max-w-lg mx-auto space-y-3 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => setBillingOrder(null)} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
          <span className="font-bold text-gray-900 text-sm">Bill for {billingOrder.kotNumber}</span>
        </div>

        {/* Items from order (readonly) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-1.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Order Items</p>
          {billingOrder.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-800">{item.name} × {item.quantity}</span>
              <span className="font-semibold text-gray-900">₹{item.subtotal.toFixed(2)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 flex justify-between font-black text-gray-900">
            <span>Subtotal</span><span>₹{orderTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Customer details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</p>
          <input
            value={billCustomer.name}
            onChange={(e) => setBillCustomer((p) => ({ ...p, name: e.target.value }))}
            placeholder="Customer name *"
            className="w-full px-3.5 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <input
            value={billCustomer.email}
            onChange={(e) => setBillCustomer((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email (for receipt + review link)"
            type="email"
            className={cn('w-full px-3.5 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30', !hasContact ? 'border-amber-300' : 'border-gray-200')}
          />
          <input
            value={billCustomer.phone}
            onChange={(e) => setBillCustomer((p) => ({ ...p, phone: e.target.value }))}
            placeholder="Phone (for WhatsApp receipt)"
            className={cn('w-full px-3.5 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30', !hasContact ? 'border-amber-300' : 'border-gray-200')}
          />
          {!hasContact && (
            <p className="text-xs text-amber-600 font-medium">Phone or email required to send receipt</p>
          )}
        </div>

        {/* Voucher */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <input
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
            placeholder="Voucher code (optional)"
            className={cn(
              'w-full px-3.5 py-3 text-sm font-mono border rounded-xl focus:outline-none focus:ring-2 transition-all uppercase',
              voucherValidation ? 'border-green-300 bg-green-50 focus:ring-green-500/30'
              : voucherError    ? 'border-red-300 bg-red-50 focus:ring-red-500/30'
              :                   'border-gray-200 focus:ring-indigo-500/30',
            )}
          />
          {voucherValidation && (
            <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {voucherValidation.discountPercent}% off — {voucherValidation.customerName}
            </p>
          )}
          {voucherError && <p className="text-xs text-red-500 mt-1.5">{voucherError}</p>}
        </div>

        {/* Error from mutation */}
        {billMutation.error && (
          <p className="text-xs text-red-500 text-center">
            {(billMutation.error as Error).message ?? 'Failed to generate bill'}
          </p>
        )}

        <button
          onClick={() => billMutation.mutate(billingOrder)}
          disabled={!billCustomer.name.trim() || !hasContact || billMutation.isPending}
          className="w-full py-4 text-white text-base font-bold rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] bg-indigo-600"
        >
          <Receipt className="w-5 h-5" />
          {billMutation.isPending ? 'Generating…' : 'Generate Bill & Close Order'}
        </button>
      </div>
    )
  }

  // ── Orders list ─────────────────────────────────────────────────────────────
  if (myOrders.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        No orders placed today yet.<br />Start taking orders from the New Order tab.
      </div>
    )
  }

  const ready     = myOrders.filter((o) => o.status === 'ready')
  const active    = myOrders.filter((o) => o.status === 'pending' || o.status === 'preparing')
  const completed = myOrders.filter((o) => o.status === 'billed' || o.status === 'cancelled')

  const OrderCard = ({ order, highlight }: { order: Order; highlight?: boolean }) => {
    const cfg = ORDER_STATUS[order.status] ?? ORDER_STATUS.pending
    const elapsed = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-4 space-y-2.5"
        style={{
          background: highlight ? '#ecfdf5' : '#fff',
          border: `2px solid ${highlight ? '#6ee7b7' : '#f3f4f6'}`,
          boxShadow: highlight ? '0 0 0 4px rgba(52,211,153,0.15)' : undefined,
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-gray-900 text-sm">{order.kotNumber}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                {cfg.label}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {order.tableNumber ? `Table ${order.tableNumber}` : 'Counter'} · {order.customer.name}
              {(order.customer.phone || order.customer.email) && ` · ${order.customer.phone ?? order.customer.email}`}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {elapsed < 1 ? 'just now' : `${elapsed}m`}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {order.items.map((item, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
              {item.name} ×{item.quantity}
            </span>
          ))}
        </div>

        {order.status === 'ready' && (
          <button
            onClick={() => openBilling(order)}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: '#059669' }}
          >
            Generate Bill →
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <div className="p-4 space-y-3 max-w-lg mx-auto pb-24">
      {ready.length > 0 && (
        <div className="text-xs font-bold uppercase tracking-wider text-green-600 mt-1">
          🔔 Ready to Serve ({ready.length})
        </div>
      )}
      {ready.map((o) => <OrderCard key={o._id} order={o} highlight />)}

      {active.length > 0 && (
        <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-2">
          In Progress ({active.length})
        </div>
      )}
      {active.map((o) => <OrderCard key={o._id} order={o} />)}

      {completed.length > 0 && (
        <div className="text-xs font-bold uppercase tracking-wider text-gray-300 mt-2">
          Completed ({completed.length})
        </div>
      )}
      {completed.map((o) => (
        <div key={o._id} className="opacity-40">
          <OrderCard order={o} />
        </div>
      ))}
    </div>
  )
}

// ─── Staff Billing View ───────────────────────────────────────────────────────

function StaffBilling({ restaurant, staffName, onLogout }: { restaurant: StaffRestaurant; staffName: string; onLogout: () => void }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'order' | 'mine'>('order')
  const [readyAlert, setReadyAlert] = useState<Order | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' })
  const [tableNumber, setTableNumber] = useState('')
  const [kitchenSent, setKitchenSent] = useState(false)
  const [posSearch, setPosSearch] = useState('')
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherValidation, setVoucherValidation] = useState<VoucherValidation | null>(null)
  const [voucherError, setVoucherError] = useState<string | null>(null)
  const [generatedBill, setGeneratedBill] = useState<Bill | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['staff-menu'],
    queryFn: () => staffClient.get('/api/menu').then((r) => r.data.data.items as MenuItem[]),
  })

  const { data: myOrders = [] } = useQuery({
    queryKey: ['waiter-orders', restaurant.id, staffName],
    queryFn: () => orderApi.listMine(),
    refetchInterval: 30_000,
  })

  const handleOrderUpdated = useCallback((order: Order) => {
    queryClient.setQueryData<Order[]>(['waiter-orders', restaurant.id, staffName], (prev = []) =>
      prev.some((o) => o._id === order._id)
        ? prev.map((o) => (o._id === order._id ? order : o))
        : prev
    )
  }, [queryClient, restaurant.id, staffName])

  const handleOrderReady = useCallback((order: Order) => {
    playBell()
    setReadyAlert(order)
    setTab('mine')
    setTimeout(() => setReadyAlert((a) => (a?._id === order._id ? null : a)), 6000)
    queryClient.setQueryData<Order[]>(['waiter-orders', restaurant.id, staffName], (prev = []) =>
      prev.some((o) => o._id === order._id)
        ? prev.map((o) => (o._id === order._id ? order : o))
        : [...prev, order]
    )
  }, [queryClient, restaurant.id, staffName])

  useOrderSocket({
    restaurantId: restaurant.id,
    staffName,
    onOrderUpdated: handleOrderUpdated,
    onOrderReady: handleOrderReady,
  })

  const readyCount = myOrders.filter((o) => o.status === 'ready').length

  useEffect(() => {
    const code = voucherCode.trim().toUpperCase()
    if (!code || code.length < 6) { setVoucherValidation(null); setVoucherError(null); return }
    const timer = setTimeout(async () => {
      try {
        const result = await staffClient.get(`/api/bills/validate-voucher?code=${code}`).then((r) => r.data.data)
        setVoucherValidation(result)
        setVoucherError(null)
      } catch {
        setVoucherValidation(null)
        setVoucherError('Invalid or expired voucher')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [voucherCode])

  const createBillMutation = useMutation({
    mutationFn: () =>
      staffClient.post('/api/bills', {
        customer: { name: customer.name, email: customer.email || undefined, phone: customer.phone || undefined },
        items: cart.map((c) => ({ name: c.name, price: c.price, quantity: c.quantity })),
        voucherCode: voucherValidation ? voucherCode.trim().toUpperCase() : undefined,
      }).then((r) => r.data.data.bill as Bill),
    onSuccess: (bill) => {
      setGeneratedBill(bill)
      setCart([])
      setCustomer({ name: '', email: '', phone: '' })
      setTableNumber('')
      setKitchenSent(false)
      setVoucherCode('')
      setVoucherValidation(null)
    },
  })

  const sendToKitchenMutation = useMutation({
    mutationFn: () =>
      orderApi.create({
        customer: { name: customer.name || 'Walk-in', phone: customer.phone || undefined },
        tableNumber: tableNumber || undefined,
        orderedBy: 'staff',
        items: cart.map((c) => ({ menuItemId: c.menuItemId, name: c.name, price: c.price, quantity: c.quantity })),
      }),
    onSuccess: () => setKitchenSent(true),
  })

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.menuItemId === item._id)
      if (ex) return prev.map((c) => c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }]
    })
  }
  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((c) => c.menuItemId !== id))
    else setCart((prev) => prev.map((c) => c.menuItemId === id ? { ...c, quantity: qty } : c))
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0)
  const hasContact = !!(customer.email.trim() || customer.phone.trim())

  if (generatedBill) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm space-y-4">
          <div ref={receiptRef} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="text-center mb-4">
              {restaurant.logoUrl
                ? <img src={restaurant.logoUrl} alt={restaurant.name} className="w-12 h-12 rounded-xl object-cover mx-auto mb-2" />
                : <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-xl font-black" style={{ background: restaurant.logoColor }}>{restaurant.name[0]}</div>
              }
              <h2 className="text-lg font-black text-gray-900">{restaurant.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Receipt {generatedBill.receiptNumber}</p>
            </div>
            <div className="border-t border-dashed border-gray-200 my-3" />
            <p className="text-sm font-semibold text-gray-900 mb-2">{generatedBill.customer.name}</p>
            <div className="space-y-1.5 mb-3">
              {generatedBill.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.name} × {item.quantity}</span>
                  <span className="font-medium">₹{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-1">
              {generatedBill.taxLines.map((t, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-400">
                  <span>{t.label}</span><span>₹{t.amount.toFixed(2)}</span>
                </div>
              ))}
              {generatedBill.voucherApplied && (
                <div className="flex justify-between text-xs text-green-600 font-semibold">
                  <span>Voucher ({generatedBill.voucherApplied.discountPercent}% off)</span>
                  <span>-₹{generatedBill.voucherApplied.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-black text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span><span>₹{generatedBill.grandTotal.toFixed(2)}</span>
              </div>
            </div>
            {generatedBill.customer.email && (
              <p className="text-xs text-green-500 text-center mt-3">Receipt & review link sent to email ✓</p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-2xl bg-white">Print</button>
            <button
              onClick={() => { setGeneratedBill(null); queryClient.invalidateQueries({ queryKey: ['staff-menu'] }) }}
              className="flex-1 py-3 text-white text-sm font-bold rounded-2xl"
              style={{ background: restaurant.logoColor }}
            >
              New Bill
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        {restaurant.logoUrl
          ? <img src={restaurant.logoUrl} alt={restaurant.name} className="w-8 h-8 rounded-lg object-cover" />
          : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: restaurant.logoColor }}>{restaurant.name[0]}</div>
        }
        <span className="font-bold text-gray-900 flex-1">{restaurant.name}</span>
        <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-2 py-1 rounded-full">{staffName}</span>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-semibold">
          <button
            onClick={() => setTab('order')}
            className={cn('px-3 py-1.5 transition-colors', tab === 'order' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
          >
            New Order
          </button>
          <button
            onClick={() => setTab('mine')}
            className={cn('px-3 py-1.5 transition-colors flex items-center gap-1', tab === 'mine' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50')}
          >
            My Orders
            {readyCount > 0 && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', tab === 'mine' ? 'bg-white text-indigo-600' : 'bg-green-500 text-white')}>
                {readyCount}
              </span>
            )}
          </button>
        </div>
        <button onClick={onLogout} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Ready alert banner */}
      <AnimatePresence>
        {readyAlert && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-3 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3"
          >
            <Bell className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-800">Order Ready!</p>
              <p className="text-xs text-green-600 truncate">
                KOT #{readyAlert.kotNumber} · {readyAlert.customer.name}
                {readyAlert.tableNumber ? ` · Table ${readyAlert.tableNumber}` : ''}
              </p>
            </div>
            <button onClick={() => setReadyAlert(null)} className="text-green-400 hover:text-green-600 text-lg leading-none">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {tab === 'mine' ? (
        <WaiterOrderPanel myOrders={myOrders} restaurantId={restaurant.id} staffName={staffName} />
      ) : (
      <>
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Customer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
          <h3 className="font-semibold text-sm text-gray-900">Customer Details</h3>
          <div className="flex gap-2">
            <input value={customer.name} onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))}
              placeholder="Customer name *"
              className="flex-1 px-3.5 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Table #"
              className="w-20 px-3.5 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <input value={customer.email} onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email (for receipt)" type="email"
            className={cn('w-full px-3.5 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30', !hasContact && cart.length > 0 ? 'border-amber-300' : 'border-gray-200')} />
          <input value={customer.phone} onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
            placeholder="Phone"
            className={cn('w-full px-3.5 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30', !hasContact && cart.length > 0 ? 'border-amber-300' : 'border-gray-200')} />
          {!hasContact && cart.length > 0 && (
            <p className="text-xs text-amber-600 font-medium">Phone or email required to place order</p>
          )}
          <div>
            <input value={voucherCode} onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="Voucher code (optional)"
              className={cn(
                'w-full px-3.5 py-3 text-sm font-mono border rounded-xl focus:outline-none focus:ring-2 transition-all uppercase',
                voucherValidation ? 'border-green-300 bg-green-50 focus:ring-green-500/30' :
                voucherError      ? 'border-red-300  bg-red-50  focus:ring-red-500/30'   :
                                    'border-gray-200 focus:ring-indigo-500/30',
              )} />
            {voucherValidation && (
              <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {voucherValidation.discountPercent}% off — {voucherValidation.customerName}
              </p>
            )}
            {voucherError && <p className="text-xs text-red-500 mt-1">{voucherError}</p>}
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input value={posSearch} onChange={(e) => setPosSearch(e.target.value)}
              placeholder="Search menu…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {menuItems
              .filter((i) => i.isAvailable && (!posSearch || i.name.toLowerCase().includes(posSearch.toLowerCase())))
              .map((item) => (
                <button key={item._id} onClick={() => addToCart(item)}
                  className="text-left p-3.5 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 active:scale-95 transition-all">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs font-bold mt-0.5" style={{ color: restaurant.logoColor }}>₹{item.price.toFixed(2)}</p>
                </button>
              ))}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-sm text-gray-900">Cart</h3>
              <button onClick={() => setCart([])} className="ml-auto text-xs text-red-400">Clear</button>
            </div>
            <div className="space-y-2.5 mb-3">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center gap-2">
                  <p className="flex-1 text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.menuItemId, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 font-bold flex items-center justify-center text-base active:bg-gray-50">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.menuItemId, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 text-gray-500 font-bold flex items-center justify-center text-base active:bg-gray-50">+</button>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-16 text-right">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center font-black text-gray-900">
              <span>Total</span>
              <span>₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Sticky bill button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 space-y-2">
        {cart.length > 0 && (
          <button
            onClick={() => sendToKitchenMutation.mutate()}
            disabled={!hasContact || cart.length === 0 || sendToKitchenMutation.isPending || kitchenSent}
            className="w-full py-3 text-sm font-bold rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] border-2"
            style={{ borderColor: restaurant.logoColor, color: kitchenSent ? '#059669' : restaurant.logoColor, background: kitchenSent ? '#ecfdf5' : 'transparent' }}
          >
            <ChefHat className="w-4 h-4" />
            {kitchenSent ? 'Sent to Kitchen ✓' : sendToKitchenMutation.isPending ? 'Sending…' : 'Send to Kitchen'}
          </button>
        )}
        <button
          onClick={() => createBillMutation.mutate()}
          disabled={!customer.name.trim() || !hasContact || cart.length === 0 || createBillMutation.isPending}
          className="w-full py-4 text-white text-base font-bold rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{ background: restaurant.logoColor }}
        >
          <Receipt className="w-5 h-5" />
          {createBillMutation.isPending ? 'Generating…' : `Generate Bill${cartTotal > 0 ? ` — ₹${cartTotal.toFixed(2)}` : ''}`}
        </button>
        {cart.length > 0 && (!customer.name.trim() || !hasContact) && (
          <p className="text-xs text-amber-500 text-center">
            {!customer.name.trim() ? 'Enter customer name' : 'Enter phone or email'} to proceed
          </p>
        )}
      </div>
      </>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [restaurant, setRestaurant] = useState<StaffRestaurant | null>(null)
  const [staffName, setStaffName] = useState('')

  const handleLogin = (r: StaffRestaurant, name: string) => {
    setRestaurant(r)
    setStaffName(name)
  }

  const handleLogout = () => {
    clearStaffToken()
    setRestaurant(null)
    setStaffName('')
  }

  if (!restaurant) {
    return <PinLogin onLogin={handleLogin} />
  }

  return <StaffBilling restaurant={restaurant} staffName={staffName} onLogout={handleLogout} />
}
