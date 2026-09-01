import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseModalA11yOptions {
  /** Whether the modal is currently open/visible. */
  isOpen: boolean;
  /** Called when the user presses Escape (only wired if closeOnEscape is true). */
  onClose?: () => void;
  /** Whether Escape should close the modal. Default true. Set false for modals with no dismiss path (e.g. a mandatory auth gate). */
  closeOnEscape?: boolean;
  /**
   * Optional selector (relative to the panel) for the element that should
   * receive initial focus when the modal opens. Falls back to the first
   * focusable element, then the panel itself.
   */
  initialFocusSelector?: string;
}

/**
 * Shared accessibility behavior for the app's hand-rolled modals/overlays:
 * - moves focus into the panel when it opens
 * - traps Tab/Shift+Tab focus within the panel while open
 * - closes on Escape (when closeOnEscape is true and onClose is provided)
 * - restores focus to whatever was focused before the modal opened, once it closes
 *
 * This intentionally does not change markup, styling, or animation — it only
 * attaches behavior to the ref you place on the modal's panel element (the
 * actual dialog surface, not the full-screen backdrop).
 */
export function useModalA11y<T extends HTMLElement>({
  isOpen,
  onClose,
  closeOnEscape = true,
  initialFocusSelector,
}: UseModalA11yOptions) {
  const panelRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    if (panel) {
      const preferred = initialFocusSelector
        ? panel.querySelector<HTMLElement>(initialFocusSelector)
        : null;
      const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = preferred ?? firstFocusable ?? panel;
      // Defer so entrance animations / conditional rendering settle first.
      const raf = requestAnimationFrame(() => target.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [isOpen, initialFocusSelector]);

  useEffect(() => {
    if (!isOpen) {
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus();
      }
      previouslyFocusedRef.current = null;
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (closeOnEscape && onClose) {
          event.preventDefault();
          onClose();
        }
        return;
      }

      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        el => el.offsetParent !== null,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !panel.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, closeOnEscape]);

  return panelRef;
}
