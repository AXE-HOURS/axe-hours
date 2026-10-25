import { useEffect, useRef } from 'react';

/**
 * Custom hook to handle Escape key press and focus restoration for modals and overlays.
 * @param isOpen whether the modal is currently open
 * @param onClose callback to close the modal
 * @param triggerRef optional ref to the trigger element that opened the modal
 */
export function useEscapeKey(
  isOpen: boolean,
  onClose: () => void,
  triggerRef?: React.RefObject<HTMLElement | null>
) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Capture the element that had focus before the modal opened
    previousActiveElement.current = (document.activeElement as HTMLElement) || null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      // Restore focus to trigger element or previously active element
      if (triggerRef?.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      } else if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      } else if (document.body && typeof document.body.focus === 'function') {
        document.body.focus();
      }
    };
  }, [isOpen, onClose, triggerRef]);
}

export default useEscapeKey;

