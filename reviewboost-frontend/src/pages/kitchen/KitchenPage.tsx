import { useState, useCallback, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, Clock, Loader2, Bell } from 'lucide-react'
import { orderApi, type Order, type OrderStatus } from '../../api/orderApi'
import { useOrderSocket } from '../../hooks/useOrderSocket'
import { staffApi, setStaffToken } from '../../api/staffApi'

function playBell() {
  try {
    const ctx = new AudioContext()
    // Two-tone bell: high note fading into lower harmonic
    const notes = [880, 1320]
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.8)
      gain.gain.setValueAtTime(i === 0 ? 0.6 : 0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
      osc.start(ctx.currentTime + i * 0.1)
      osc.stop(ctx.currentTime + 1.3)
      osc.onended = () => { if (i === notes.length - 1) ctx.close() }
    })
  } catch { /* AudioContext unavailable */ }
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string; next?: OrderStatus; nextLabel?: string }> = {
  pending:   { label: 'New',       color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', next: 'preparing', nextLabel: 'Start Preparing' },
  preparing: { label: 'Preparing', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', next: 'ready',     nextLabel: 'Mark Ready'       },
  ready:     { label: 'Ready',     color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
  billed:    { label: 'Billed',    color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: '#f9fafb', border: '#d1d5db' },
}

function OrderCard({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, s: OrderStatus) => void }) {
  const cfg = STATUS_CONFIG[order.status]
  const elapsed = Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{ background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: '#111827' }}>{order.kotNumber}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            {order.tableNumber ? `Table ${order.tableNumber}` : 'Counter'} · {order.customer.name}
          </div>
        </div>
        <span style={{ background: cfg.color, color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
          {cfg.label}
        </span>
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {order.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.04)', borderRadius: 8, padding: '7px 12px' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.name}</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: cfg.color }}>×{item.quantity}</span>
          </div>
        ))}
        {order.notes && (
          <div style={{ fontSize: 12, color: '#d97706', fontStyle: 'italic', paddingLeft: 4 }}>
            Note: {order.notes}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9ca3af', fontSize: 12 }}>
          <Clock size={13} />
          {elapsed < 1 ? 'Just now' : `${elapsed}m ago`}
        </div>
        {cfg.next && (
          <button
            onClick={() => onStatusChange(order._id, cfg.next!)}
            style={{ background: cfg.color, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            {cfg.nextLabel}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Login screen ─────────────────────────────────────────────────────────────

function KitchenLogin({ onLogin }: { onLogin: (restaurantId: string, name: string) => void }) {
  const [slug, setSlug]     = useState('')
  const [pin, setPin]       = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await staffApi.login(slug, pin, 'Kitchen Display')
      setStaffToken(data.token)
      onLogin(data.restaurant.id, data.restaurant.name)
    } catch {
      setError('Invalid restaurant or PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submit} style={{ background: '#1f2937', borderRadius: 20, padding: 40, width: 340, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <ChefHat size={40} color="#6366f1" />
          <h2 style={{ color: '#fff', margin: '12px 0 4px', fontSize: 22, fontWeight: 900 }}>Kitchen Display</h2>
          <p style={{ color: '#9ca3af', fontSize: 13 }}>Sign in with your staff PIN</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            value={slug} onChange={(e) => setSlug(e.target.value)}
            placeholder="Restaurant slug"
            style={{ background: '#374151', border: '1px solid #4b5563', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14, outline: 'none' }}
            required
          />
          <input
            value={pin} onChange={(e) => setPin(e.target.value)}
            placeholder="6-digit PIN"
            type="password"
            maxLength={6}
            style={{ background: '#374151', border: '1px solid #4b5563', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 14, outline: 'none' }}
            required
          />
          {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}
          <button
            type="submit" disabled={loading}
            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 4 }}
          >
            {loading ? 'Signing in…' : 'Enter Kitchen'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Kitchen Page ────────────────────────────────────────────────────────

export default function KitchenPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState('')
  const [newAlert, setNewAlert] = useState(false)
  const [billedDate, setBilledDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [mobileCol, setMobileCol] = useState<'new' | 'preparing' | 'ready' | 'billed'>('new')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const qc = useQueryClient()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['kitchen-orders', restaurantId],
    queryFn: () => orderApi.list(),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  })

  const { data: billedTodayData = [] } = useQuery({
    queryKey: ['kitchen-billed-today', restaurantId, billedDate],
    queryFn: () => orderApi.listBilledForDate(billedDate),
    enabled: !!restaurantId,
    refetchInterval: 60_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kitchen-orders', restaurantId] }),
  })

  const handleNew = useCallback((order: Order) => {
    qc.setQueryData<Order[]>(['kitchen-orders', restaurantId], (prev = []) => {
      if (prev.find((o) => o._id === order._id)) return prev
      return [order, ...prev]
    })
    playBell()
    setNewAlert(true)
    setTimeout(() => setNewAlert(false), 3000)
  }, [qc, restaurantId])

  const handleUpdated = useCallback((order: Order) => {
    qc.setQueryData<Order[]>(['kitchen-orders', restaurantId], (prev = []) =>
      order.status === 'billed' || order.status === 'cancelled'
        ? prev.filter((o) => o._id !== order._id)
        : prev.map((o) => (o._id === order._id ? order : o))
    )
    // Move billed orders into the transparency column (only if viewing today)
    if (order.status === 'billed') {
      const today = new Date().toISOString().slice(0, 10)
      qc.setQueryData<Order[]>(['kitchen-billed-today', restaurantId, today], (prev = []) =>
        prev.find((o) => o._id === order._id) ? prev : [order, ...prev]
      )
    }
  }, [qc, restaurantId])

  useOrderSocket({ restaurantId, onNewOrder: handleNew, onOrderUpdated: handleUpdated })

  if (!restaurantId) {
    return <KitchenLogin onLogin={(id, name) => { setRestaurantId(id); setRestaurantName(name) }} />
  }

  const pending    = orders.filter((o) => o.status === 'pending')
  const preparing  = orders.filter((o) => o.status === 'preparing')
  const ready      = orders.filter((o) => o.status === 'ready')
  const billedToday = billedTodayData

  const col = (title: string, items: Order[], accent: string) => (
    <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: `3px solid ${accent}` }}>
        <span style={{ fontSize: 22 }}>{title === 'New Orders' ? '🔔' : title === 'Preparing' ? '🍳' : '✅'}</span>
        <h2 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 900 }}>{title}</h2>
        <span style={{ background: accent, color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 13, fontWeight: 800, marginLeft: 'auto' }}>{items.length}</span>
      </div>
      <AnimatePresence>
        {items.map((o) => (
          <OrderCard
            key={o._id}
            order={o}
            onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
          />
        ))}
        {items.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontSize: 14 }}>
            No orders
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#111827', padding: 24 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ChefHat size={28} color="#6366f1" />
          <div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 900 }}>Kitchen Display</h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>{restaurantName}</p>
          </div>
        </div>
        <AnimatePresence>
          {newAlert && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#dc2626', color: '#fff', borderRadius: 12, padding: '10px 18px', fontWeight: 700 }}
            >
              <Bell size={18} /> New Order!
            </motion.div>
          )}
        </AnimatePresence>
        {isLoading && <Loader2 size={20} color="#6b7280" className="animate-spin" />}
      </div>

      {/* Mobile column tabs */}
      {isMobile && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([
            { id: 'new',       emoji: '🔔', label: 'New',     count: pending.length,    accent: '#dc2626' },
            { id: 'preparing', emoji: '🍳', label: 'Prep',    count: preparing.length,  accent: '#d97706' },
            { id: 'ready',     emoji: '✅', label: 'Ready',   count: ready.length,      accent: '#059669' },
            { id: 'billed',    emoji: '✓',  label: 'Billed',  count: billedToday.length, accent: '#4b5563' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileCol(tab.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 12,
                border: `2px solid ${mobileCol === tab.id ? tab.accent : '#374151'}`,
                background: mobileCol === tab.id ? tab.accent + '22' : 'transparent',
                color: mobileCol === tab.id ? tab.accent : '#6b7280',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.emoji}</span>
              <span>{tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}</span>
            </button>
          ))}
        </div>
      )}

      {/* Columns */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {(!isMobile || mobileCol === 'new')       && col('New Orders', pending, '#dc2626')}
        {(!isMobile || mobileCol === 'preparing') && col('Preparing', preparing, '#d97706')}
        {(!isMobile || mobileCol === 'ready')     && col('Ready', ready, '#059669')}

        {/* Billed — transparency column with date filter */}
        {(!isMobile || mobileCol === 'billed') && <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12, borderBottom: '3px solid #4b5563' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>✓</span>
              <h2 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 900 }}>Billed</h2>
              <span style={{ background: '#4b5563', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 13, fontWeight: 800, marginLeft: 'auto' }}>{billedToday.length}</span>
            </div>
            <input
              type="date"
              value={billedDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBilledDate(e.target.value)}
              style={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 8,
                padding: '6px 10px',
                color: '#d1d5db',
                fontSize: 13,
                outline: 'none',
                width: '100%',
                colorScheme: 'dark',
              }}
            />
          </div>
          <AnimatePresence>
            {billedToday.map((o) => {
              const elapsed = Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000)
              return (
                <motion.div
                  key={o._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '2px solid #374151', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#e5e7eb' }}>{o.kotNumber}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {o.tableNumber ? `Table ${o.tableNumber}` : 'Counter'} · {o.customer.name}
                        {o.staffName ? ` · ${o.staffName}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6b7280', fontSize: 12 }}>
                      <Clock size={12} />
                      {elapsed < 1 ? 'Just now' : `${elapsed}m ago`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {o.items.map((item, i) => (
                      <span key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#9ca3af' }}>
                        {item.name} ×{item.quantity}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )
            })}
            {billedToday.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: 40, color: '#6b7280', fontSize: 14 }}>
                No bills yet today
              </motion.div>
            )}
          </AnimatePresence>
        </div>}
      </div>
    </div>
  )
}
