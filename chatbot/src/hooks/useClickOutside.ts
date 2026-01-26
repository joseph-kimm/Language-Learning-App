import { RefObject, useEffect } from 'react';

/**
 * Custom hook to detect clicks outside of a referenced element
 *
 * @param ref - React ref of the element to monitor
 * @param callback - Function to call when click occurs outside the element
 * @param enabled - Whether the hook is active (default: true)
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event: MouseEvent) => {
      // Check if click was outside the referenced element
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    // Use mousedown instead of click for better UX
    // (fires before onClick handlers)
    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [ref, callback, enabled]);
}
