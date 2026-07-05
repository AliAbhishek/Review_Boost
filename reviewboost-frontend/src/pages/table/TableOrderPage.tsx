import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Plus, Minus, CheckCircle, Loader2 } from 'lucide-react'
import axios from 'axios'
import { orderApi } from '../../api/orderApi'

const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

interface RestaurantInfo {
  name: string
  logoUrl?: string
  logoColor: string
  slug: string
}

interface MenuItemData {
  _id: string
  name: string
  price: number
  originalPrice?: number
  discountPercent?: number
  category: string
  description?: string
  isAvailable: boolean
}

interface Cart {
  [itemId: string]: { item: MenuItemData; qty: number }
}

function LogoAvatar({ logoUrl, name, color, size = 48 }: { logoUrl?: string; name: string; color: string; size?: number }) {
  if (logoUrl) return <img src={logoUrl} alt={name} style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), objectFit: 'cover' }} />
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: Math.round(size * 0.25), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#fff', fontSize: Math.round(size * 0.4), fontWeight: 900 }}>{name[0]?.toUpperCase()}</span>
    </div>
  )
}

export default function TableOrderPage() {
  const { slug, tableNumber } = useParams<{ slug: string; tableNumber: string }>()
  const [cart, setCart]     = useState<Cart>({})
  const [step, setStep]     = useState<'menu' | 'checkout' | 'done'>('menu')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]   = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-menu', slug],
    queryFn: () =>
      axios.get<{ status: string; data: { restaurant: RestaurantInfo; items: MenuItemData[] } }>(
        `${base}/api/public/menu/${slug}`
      ).then((r) => r.data.data),
    enabled: !!slug,
  })

  const restaurant = data?.restaurant
  const items      = data?.items ?? []

  const categories = [...new Set(items.map((i) => i.category))].sort()
  const cartItems  = Object.values(cart).filter((e) => e.qty > 0)
  const cartTotal  = cartItems.reduce((s, e) => s + e.item.price * e.qty, 0)
  const cartCount  = cartItems.reduce((s, e) => s + e.qty, 0)

  function addToCart(item: MenuItemData) {
    setCart((prev) => ({
      ...prev,
      [item._id]: { item, qty: (prev[item._id]?.qty ?? 0) + 1 },
    }))
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => {
      const qty = (prev[itemId]?.qty ?? 0) - 1
      if (qty <= 0) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: { ...prev[itemId], qty } }
    })
  }

  async function placeOrder() {
    if (!customerName.trim()) { setError('Please enter your name'); return }
    if (!customerPhone.trim()) { setError('Phone number is required so we can update you on your order'); return }
    setSubmitting(true)
    setError('')
    try {
      await orderApi.publicCreate(slug!, tableNumber!, {
        customer: { name: customerName.trim(), phone: customerPhone.trim() || undefined },
        tableNumber,
        orderedBy: 'customer',
        notes: notes.trim() || undefined,
        items: cartItems.map((e) => ({
          menuItemId: e.item._id,
          name: e.item.name,
          price: e.item.price,
          quantity: e.qty,
        })),
      })
      setStep('done')
    } catch {
      setError('Failed to place order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <Loader2 size={32} className="animate-spin" color="#6366f1" />
    </div>
  )

  if (isError || !restaurant) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <p style={{ color: '#ef4444', fontSize: 16 }}>Restaurant not found.</p>
    </div>
  )

  if (step === 'done') return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <CheckCircle size={56} color="#059669" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: '0 0 8px' }}>Order Placed!</h2>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Your order has been sent to the kitchen. We'll have it ready soon!</p>
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 16 }}>Table {tableNumber} · {restaurant.name}</p>
        <button
          onClick={() => { setCart({}); setStep('menu'); setCustomerName(''); setCustomerPhone('') }}
          style={{ marginTop: 24, background: restaurant.logoColor, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          Order More
        </button>
      </motion.div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: cartCount > 0 ? 100 : 24 }}>
      {/* Header */}
      <div style={{ background: restaurant.logoColor, padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <LogoAvatar logoUrl={restaurant.logoUrl} name={restaurant.name} color={restaurant.logoColor} size={48} />
        <div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: 20, fontWeight: 900 }}>{restaurant.name}</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Table {tableNumber} · Self Order</p>
        </div>
      </div>

      {step === 'menu' && (
        <div style={{ padding: '20px 16px' }}>
          {categories.map((cat) => (
            <div key={cat} style={{ marginBottom: 28 }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: 1 }}>{cat}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.filter((i) => i.category === cat).map((item) => {
                  const qty = cart[item._id]?.qty ?? 0
                  return (
                    <div key={item._id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{item.name}</div>
                        {item.description && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{item.description}</div>}
                        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, color: restaurant.logoColor, fontSize: 15 }}>₹{item.price}</span>
                          {item.originalPrice && item.originalPrice > item.price && (
                            <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>₹{item.originalPrice}</span>
                          )}
                        </div>
                      </div>
                      {qty === 0 ? (
                        <button
                          onClick={() => addToCart(item)}
                          style={{ background: restaurant.logoColor, color: '#fff', border: 'none', borderRadius: 10, width: 36, height: 36, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={18} />
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button onClick={() => removeFromCart(item._id)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={15} /></button>
                          <span style={{ fontWeight: 800, fontSize: 16, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                          <button onClick={() => addToCart(item)} style={{ background: restaurant.logoColor, color: '#fff', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={15} /></button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 'checkout' && (
        <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ fontWeight: 900, fontSize: 18, color: '#111827', margin: '0 0 20px' }}>Your Order</h2>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            {cartItems.map((e) => (
              <div key={e.item._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 14, color: '#374151' }}>{e.item.name} ×{e.qty}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>₹{(e.item.price * e.qty).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontWeight: 900, fontSize: 16 }}>
              <span>Total</span>
              <span style={{ color: restaurant.logoColor }}>₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: '#374151' }}>Your Details</h3>
            <input
              value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your name *"
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
            />
            <input
              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone number *"
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
            />
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests? (optional)"
              rows={2}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 14, resize: 'none', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setStep('menu')}
              style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 12, padding: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              onClick={placeOrder} disabled={submitting}
              style={{ flex: 2, background: restaurant.logoColor, color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Placing…</> : 'Place Order'}
            </button>
          </div>
        </div>
      )}

      {/* Floating cart bar */}
      <AnimatePresence>
        {cartCount > 0 && step === 'menu' && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            style={{ position: 'fixed', bottom: 20, left: 20, right: 20, background: restaurant.logoColor, borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 50 }}
            onClick={() => setStep('checkout')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontWeight: 800, fontSize: 14 }}>{cartCount}</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>View Order</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 800, fontSize: 16 }}>₹{cartTotal.toFixed(2)}</span>
              <ShoppingCart size={20} color="#fff" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
