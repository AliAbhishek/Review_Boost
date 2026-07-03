import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle, Delete, LogOut, Receipt, ShoppingCart, Search } from 'lucide-react'
import { staffApi, staffClient, setStaffToken, clearStaffToken, type StaffRestaurant } from '@/api/staffApi'
import { cn } from '@/utils/cn'
import type { MenuItem } from '@/types/menu'
import type { Bill, CartItem } from '@/types/bill'
import type { VoucherValidation } from '@/types/voucher'

// ─── PIN Login ────────────────────────────────────────────────────────────────

function PinLogin({ onLogin }: { onLogin: (restaurant: StaffRestaurant) => void }) {
  const [slug, setSlug] = useState('')
  const [pin, setPin] = useState('')
  const [stage, setStage] = useState<'slug' | 'pin'>('slug')
  const [error, setError] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: () => staffApi.login(slug.trim().toLowerCase(), pin),
    onSuccess: ({ token, restaurant }) => {
      setStaffToken(token)
      onLogin(restaurant)
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
    if (pin.length === 6) {
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
              onClick={() => { if (slug.trim()) { setStage('pin'); setError(null) } }}
              disabled={!slug.trim()}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl disabled:opacity-40 transition-all active:scale-95"
            >
              Continue →
            </button>
          </div>
        ) : (
          <div>
            <button onClick={() => { setStage('slug'); setPin('') }} className="text-xs text-gray-500 mb-5 flex items-center gap-1 hover:text-gray-300 transition-colors">
              ← {slug}
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

// ─── Staff Billing View ───────────────────────────────────────────────────────

function StaffBilling({ restaurant, onLogout }: { restaurant: StaffRestaurant; onLogout: () => void }) {
  const queryClient = useQueryClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' })
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
      setVoucherCode('')
      setVoucherValidation(null)
    },
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
        <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-2 py-1 rounded-full">Staff Mode</span>
        <button onClick={onLogout} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Customer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5">
          <h3 className="font-semibold text-sm text-gray-900">Customer Details</h3>
          <input value={customer.name} onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))}
            placeholder="Customer name *"
            className="w-full px-3.5 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          <input value={customer.email} onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email (for receipt)" type="email"
            className="w-full px-3.5 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          <input value={customer.phone} onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
            placeholder="Phone (optional)"
            className="w-full px-3.5 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
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
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
        <button
          onClick={() => createBillMutation.mutate()}
          disabled={!customer.name.trim() || cart.length === 0 || createBillMutation.isPending}
          className="w-full py-4 text-white text-base font-bold rounded-2xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98]"
          style={{ background: restaurant.logoColor }}
        >
          <Receipt className="w-5 h-5" />
          {createBillMutation.isPending ? 'Generating…' : `Generate Bill${cartTotal > 0 ? ` — ₹${cartTotal.toFixed(2)}` : ''}`}
        </button>
        {!customer.name.trim() && cart.length > 0 && (
          <p className="text-xs text-amber-500 text-center mt-1.5">Enter customer name to proceed</p>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [restaurant, setRestaurant] = useState<StaffRestaurant | null>(null)

  const handleLogout = () => {
    clearStaffToken()
    setRestaurant(null)
  }

  if (!restaurant) {
    return <PinLogin onLogin={setRestaurant} />
  }

  return <StaffBilling restaurant={restaurant} onLogout={handleLogout} />
}
