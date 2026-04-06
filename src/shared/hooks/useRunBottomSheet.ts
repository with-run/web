import { useEffect, useRef, useState } from 'react';
import { useDragControls, type PanInfo } from 'motion/react';

export type RunBottomSheetSnap = 'collapsed' | 'middle' | 'expanded';

interface UseRunBottomSheetOptions {
  initialSnap?: RunBottomSheetSnap;
  onSnapChange?: (snap: RunBottomSheetSnap) => void;
  bottomInset?: number;
}

export const useRunBottomSheet = ({
  initialSnap = 'collapsed',
  onSnapChange,
  bottomInset = 0,
}: UseRunBottomSheetOptions = {}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(80);
  const [sheetSnap, setSheetSnap] = useState<RunBottomSheetSnap>(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();
  const contentPullStartYRef = useRef<number | null>(null);
  const contentPullDistanceRef = useRef(0);

  const collapsibleRange = Math.max(0, sheetHeight - headerHeight - bottomInset);
  const middleY = collapsibleRange * 0.5;
  const EXPANDED_THRESHOLD = 0.6;
  const COLLAPSED_THRESHOLD = 0.4;
  const CONTENT_PULL_DOWN_THRESHOLD = 72;

  function getSnapY(snap: RunBottomSheetSnap) {
    if (snap === 'expanded') return 0;
    if (snap === 'middle') return middleY;
    return collapsibleRange;
  }

  useEffect(() => {
    if (!sheetRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSheetHeight(entry.contentRect.height);
    });
    observer.observe(sheetRef.current);
    return () => observer.disconnect();
  }, []);

  // 바텀시트 헤더 사이즈 계산용 ref observer
  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeaderHeight(entry.contentRect.height);
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    onSnapChange?.(sheetSnap);
  }, [sheetSnap, onSnapChange]);

  function collapse() {
    setSheetSnap('collapsed');
  }

  function toMiddle() {
    setSheetSnap('middle');
  }

  function expand() {
    setSheetSnap('expanded');
  }

  function stepDown() {
    setSheetSnap((prev) => {
      if (prev === 'expanded') return 'middle';
      if (prev === 'middle') return 'collapsed';
      return 'collapsed';
    });
  }

  function startDrag(e: React.PointerEvent) {
    dragControls.start(e);
  }

  function handleDragStart() {
    setIsDragging(true);
    dragStartYRef.current = getSnapY(sheetSnap);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    setIsDragging(false);

    // 빠른 플릭은 양 끝 스냅으로 바로 보낸다.
    if (info.velocity.y > 900) {
      setSheetSnap('collapsed');
      return;
    }
    if (info.velocity.y < -900) {
      setSheetSnap('expanded');
      return;
    }

    const nextY = Math.min(
      collapsibleRange,
      Math.max(0, dragStartYRef.current + info.offset.y)
    );

    if (collapsibleRange <= 0) {
      setSheetSnap('expanded');
      return;
    }

    // 0(bottom) ~ 1(top) 진행률 기준으로 3단 스냅.
    const progress = 1 - nextY / collapsibleRange;
    if (progress >= EXPANDED_THRESHOLD) {
      setSheetSnap('expanded');
    } else if (progress <= COLLAPSED_THRESHOLD) {
      setSheetSnap('collapsed');
    } else {
      setSheetSnap('middle');
    }
  }

  function handleContentTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (sheetSnap === 'collapsed') {
      contentPullStartYRef.current = null;
      contentPullDistanceRef.current = 0;
      return;
    }

    if (e.currentTarget.scrollTop > 0) {
      contentPullStartYRef.current = null;
      contentPullDistanceRef.current = 0;
      return;
    }

    contentPullStartYRef.current = e.touches[0]?.clientY ?? null;
    contentPullDistanceRef.current = 0;
  }

  function handleContentTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (contentPullStartYRef.current == null) return;
    if (e.currentTarget.scrollTop > 0) return;

    const currentY = e.touches[0]?.clientY;
    if (typeof currentY !== 'number') return;

    const deltaY = currentY - contentPullStartYRef.current;
    contentPullDistanceRef.current = Math.max(0, deltaY);
  }

  function handleContentTouchEnd() {
    if (contentPullDistanceRef.current >= CONTENT_PULL_DOWN_THRESHOLD) {
      stepDown();
    }
    contentPullStartYRef.current = null;
    contentPullDistanceRef.current = 0;
  }

  return {
    sheetRef,
    headerRef,
    sheetHeight,
    headerHeight,
    sheetSnap,
    sheetOffsetY: getSnapY(sheetSnap),
    isDragging,
    dragControls,
    collapse,
    toMiddle,
    expand,
    stepDown,
    startDrag,
    handleDragStart,
    handleDragEnd,
    handleContentTouchStart,
    handleContentTouchMove,
    handleContentTouchEnd,
  };
};
