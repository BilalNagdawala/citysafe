import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

type SnapState = 'collapsed' | 'half' | 'full';

interface BottomSheetProps {
  children: React.ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  onClose?: () => void;
}

export function BottomSheet({ children, className, defaultExpanded = false }: BottomSheetProps) {
  const [snapState, setSnapState] = useState<SnapState>(defaultExpanded ? 'half' : 'collapsed');
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const initialTranslateY = useRef(0);

  const getTranslateYForState = (state: SnapState) => {
    if (typeof window === 'undefined') return 0;
    const windowHeight = window.innerHeight;
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height || windowHeight;
    
    const visibleFull = windowHeight * 0.85;
    const visibleHalf = windowHeight * 0.55;
    const visibleCollapsed = windowHeight * 0.30;
    
    switch(state) {
      case 'full': return Math.max(0, sheetHeight - visibleFull);
      case 'half': return Math.max(0, sheetHeight - visibleHalf);
      case 'collapsed': return Math.max(0, sheetHeight - visibleCollapsed);
      default: return Math.max(0, sheetHeight - visibleCollapsed);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sheetRef.current) return;
    
    // Only enable dragging logic on non-desktop widths
    if (window.innerWidth >= 768) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartY.current = e.clientY;
    
    const currentTranslate = getTranslateYForState(snapState);
    initialTranslateY.current = currentTranslate;
    setDragY(currentTranslate);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !sheetRef.current) return;
    
    const deltaY = e.clientY - dragStartY.current;
    let newY = initialTranslateY.current + deltaY;
    
    // Add rubber banding if dragged above 'full' (y < 0)
    if (newY < 0) {
      newY = newY * 0.2; 
    }
    
    setDragY(newY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    const deltaY = e.clientY - dragStartY.current;
    let nextState = snapState;
    
    const windowHeight = window.innerHeight;
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height || windowHeight;
    const fullY = Math.max(0, sheetHeight - (windowHeight * 0.85));
    const halfY = Math.max(0, sheetHeight - (windowHeight * 0.55));
    const collapsedY = Math.max(0, sheetHeight - (windowHeight * 0.30));
    
    const currentY = dragY;

    const distFull = Math.abs(currentY - fullY);
    const distHalf = Math.abs(currentY - halfY);
    const distCollapsed = Math.abs(currentY - collapsedY);
    
    // Snap based on swipe direction if moved more than 20px
    if (Math.abs(deltaY) > 20) {
      if (deltaY > 0) {
        // Swiped down
        if (snapState === 'full') nextState = 'half';
        else if (snapState === 'half') nextState = 'collapsed';
      } else {
        // Swiped up
        if (snapState === 'collapsed') nextState = 'half';
        else if (snapState === 'half') nextState = 'full';
      }
    } else {
      // Snap to closest position
      if (distFull < distHalf && distFull < distCollapsed) nextState = 'full';
      else if (distHalf < distFull && distHalf < distCollapsed) nextState = 'half';
      else nextState = 'collapsed';
    }
    
    setSnapState(nextState);
  };

  useEffect(() => {
    // Initial mount position calculation
    setDragY(getTranslateYForState(snapState));
  }, []);

  useEffect(() => {
    if (!isDragging) {
      setDragY(getTranslateYForState(snapState));
    }
  }, [snapState, isDragging]);
  
  useEffect(() => {
    const handleResize = () => {
      if (!isDragging) {
        setDragY(getTranslateYForState(snapState));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [snapState, isDragging]);

  const style = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
  };

  return (
    <div
      ref={sheetRef}
      className={clsx(
        "fixed left-0 right-0 bottom-0 w-full z-40 bg-card rounded-t-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_-15px_50px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden border-t border-[--border]",
        "md:!transform-none md:!transition-none md:relative md:inset-auto md:w-[420px] md:h-full md:max-h-full md:rounded-none md:border-t-0 md:border-r md:shadow-lg shrink-0",
        className
      )}
      style={{
        height: 'calc(100dvh - env(safe-area-inset-top) - 10px)',
        paddingBottom: 'calc(72px + env(safe-area-inset-bottom))', // Bottom Nav is ~72px height
        ...style
      }}
    >
      {/* Touch Drag Handle */}
      <div 
        className="w-full flex items-center justify-center min-h-[44px] py-2 md:hidden cursor-grab active:cursor-grabbing shrink-0 z-50 touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <div className="w-14 h-1.5 bg-muted-fg/40 rounded-full" />
      </div>
      
      {/* Content Area */}
      <div 
        className="flex-1 overflow-y-auto px-5 md:pb-5 md:pt-5"
        style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
    </div>
  );
}
