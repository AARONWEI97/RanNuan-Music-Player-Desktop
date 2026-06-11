import { useState, useRef, useCallback, useEffect } from 'react'
import { showToast } from '@/utils/toast'
import { stop } from '@/services/audioService'

/**
 * P2-15: 睡眠定时器 hook
 * 设定倒计时，到时间自动暂停播放
 */
export function useSleepTimer() {
  const [remaining, setRemaining] = useState(0) // 剩余秒数
  const [active, setActive] = useState(false)
  const endTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tick = useCallback(() => {
    const now = Date.now()
    const left = Math.max(0, Math.ceil((endTimeRef.current - now) / 1000))
    setRemaining(left)
    if (left <= 0) {
      // 时间到，停止播放
      stop()
      setActive(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      showToast('睡眠定时', '已到时间，播放已停止')
    }
  }, [])

  const start = useCallback((minutes: number) => {
    endTimeRef.current = Date.now() + minutes * 60 * 1000
    setActive(true)
    setRemaining(minutes * 60)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(tick, 1000)
    showToast('睡眠定时', `${minutes} 分钟后停止播放`)
  }, [tick])

  const cancel = useCallback(() => {
    setActive(false)
    setRemaining(0)
    endTimeRef.current = 0
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    showToast('睡眠定时', '已取消')
  }, [])

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const formatRemaining = () => {
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return { active, remaining, formattedRemaining: formatRemaining(), start, cancel }
}
