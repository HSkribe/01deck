import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders its children into document.body via a React portal.
 *
 * Every hand-rolled modal/overlay in this app positions its backdrop with
 * `fixed inset-0` and expects that to fill the real viewport. That only
 * holds if every ancestor is a normal, untransformed box — per the CSS
 * spec, `transform`, `filter`, `backdrop-filter`, `perspective`, `contain`,
 * and some `will-change` values all establish a new containing block for
 * `position: fixed` (and `absolute`) descendants. If a modal is ever
 * rendered underneath such an ancestor (e.g. TopBar's `backdropFilter:
 * blur(...)`), its "fullscreen" backdrop silently collapses to that
 * ancestor's own box instead of the viewport — which is exactly what was
 * happening to the profile modal, rendered from the avatar button inside
 * TopBar's blurred header bar.
 *
 * Portaling to document.body sidesteps the problem structurally: the
 * modal's DOM position is no longer coupled to wherever it happens to be
 * mounted in the React tree, so this fix benefits every current and future
 * consumer without each one needing to know about (or avoid) filtered
 * ancestors.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
