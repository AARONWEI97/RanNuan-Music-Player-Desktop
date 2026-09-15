import { useRef, useCallback, useEffect } from 'react';
import type React from 'react';

interface TouchGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
  minSwipeDistance?: number;
}

export function useTouchGestures(config: TouchGestureConfig) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const minSwipeDistance = config.minSwipeDistance ?? 50;
  const longPressDelay = config.longPressDelay ?? 500;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isLongPressRef.current = false;

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      config.onLongPress?.();
    }, longPressDelay);
  }, [config, longPressDelay, clearLongPressTimer]);

  const handleTouchMove = useCallback((_e: React.TouchEvent) => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPressTimer();
    
    if (!touchStartRef.current || isLongPressRef.current) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    touchStartRef.current = null;

    if (elapsed > 500) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY && absX > minSwipeDistance) {
      if (deltaX > 0) {
        config.onSwipeRight?.();
      } else {
        config.onSwipeLeft?.();
      }
    } else if (absY > absX && absY > minSwipeDistance) {
      if (deltaY > 0) {
        config.onSwipeDown?.();
      } else {
        config.onSwipeUp?.();
      }
    }
  }, [config, minSwipeDistance, clearLongPressTimer]);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
