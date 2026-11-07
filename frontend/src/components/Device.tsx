import type { ReactNode } from 'react';
import './Device.css';

/*
 * The app always renders at phone width. On a phone it fills the screen; on a
 * desktop browser it sits in a phone-sized frame. The frame is the containing
 * block for fixed elements (tab bar, toasts) and has its own scroller.
 */

const SCROLLER_ID = 'device-screen';

export function Device({ children }: { children: ReactNode }) {
  return (
    <div className="device">
      <div className="device__screen" id={SCROLLER_ID}>
        {children}
      </div>
    </div>
  );
}

export function scrollToTop() {
  document.getElementById(SCROLLER_ID)?.scrollTo(0, 0);
}
