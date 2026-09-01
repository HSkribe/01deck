import { useEffect, useRef } from 'react';

/**
 * Closes a non-modal popover/menu (a dropdown, an info flyout) on Escape or
 * on a click outside it. Unlike useModalA11y, this does NOT trap focus or
 * set aria-modal — the trigger stays part of the normal tab order, matching
 * the ARIA "menu button" pattern rather than a dialog. Attach the returned
 * ref to the element that contains BOTH the trigger button and the popover
 * content, so a click on the trigger itself doesn't count as "outside".
 */
export function useDismissableMenu<T extends HTMLElement>(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return containerRef;
}
