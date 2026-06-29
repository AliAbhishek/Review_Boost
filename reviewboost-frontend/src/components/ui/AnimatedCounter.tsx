import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  to: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
}

export default function AnimatedCounter({
  to,
  duration = 1.5,
  prefix = '',
  suffix = '',
  decimals = 0,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    startRef.current = 0
    const easeOut = (t: number) => 1 - (1 - t) ** 3

    const animate = (ts: number) => {
      if (!startRef.current || startRef.current === 0) startRef.current = ts
      const t = Math.min((ts - startRef.current) / (duration * 1000), 1)
      setCount(parseFloat((to * easeOut(t)).toFixed(decimals)))
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [to, duration, decimals])

  return (
    <>
      {prefix}
      {decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}
      {suffix}
    </>
  )
}
