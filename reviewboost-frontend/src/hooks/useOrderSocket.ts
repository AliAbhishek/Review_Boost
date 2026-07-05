import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { Order } from '../api/orderApi'

const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

interface UseOrderSocketOptions {
  restaurantId: string | null
  staffName?: string          // if set, onOrderReady fires only for this waiter's orders
  onNewOrder?: (order: Order) => void
  onOrderUpdated?: (order: Order) => void
  onOrderReady?: (order: Order) => void   // fires when waiter's own order becomes ready
}

export function useOrderSocket({
  restaurantId,
  staffName,
  onNewOrder,
  onOrderUpdated,
  onOrderReady,
}: UseOrderSocketOptions) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!restaurantId) return

    const socket = io(base, {
      query: { restaurantId },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    if (onNewOrder) socket.on('order:new', onNewOrder)

    socket.on('order:updated', (order: Order) => {
      onOrderUpdated?.(order)
      // Notify the waiter when their specific order is ready
      if (onOrderReady && staffName && order.staffName === staffName && order.status === 'ready') {
        onOrderReady(order)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [restaurantId]) // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef
}
