"use client";

import { useRef, type TouchEvent } from "react";
import type { AppView } from "@/lib/types/domain";

function isInteractiveSwipeTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "input, textarea, select, option, label, [contenteditable='true'], .modal-card, .app-tabs, .segmented-control"
    )
  );
}

type UseCalendarSwipeParams = {
  swipeViews: AppView[];
  displayedView: AppView;
  setActiveView: (view: AppView) => void;
};

/**
 * Horizontal swipe navigation between the top-level views. Extracted verbatim
 * from app/dashboard/page.tsx — behaviour unchanged.
 */
export function useCalendarSwipe({ swipeViews, displayedView, setActiveView }: UseCalendarSwipeParams) {
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  function navigateBySwipe(delta: -1 | 1) {
    const currentIndex = swipeViews.indexOf(displayedView);

    if (currentIndex === -1) {
      return;
    }

    const nextView = swipeViews[currentIndex + delta];

    if (nextView) {
      setActiveView(nextView);
    }
  }

  function handleSwipeStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1 || isInteractiveSwipeTarget(event.target)) {
      swipeStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleSwipeEnd(event: TouchEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!start || event.changedTouches.length !== 1) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 64 || absX < absY * 1.35) {
      return;
    }

    event.preventDefault();
    navigateBySwipe(deltaX < 0 ? 1 : -1);
  }

  function clearSwipe() {
    swipeStartRef.current = null;
  }

  return { handleSwipeStart, handleSwipeEnd, clearSwipe };
}
