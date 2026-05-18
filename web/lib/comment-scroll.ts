/** Find nearest ancestor with vertical scroll (e.g. BottomSheet body). */
export function getScrollableParent(start: HTMLElement | null): HTMLElement | null {
  let el = start?.parentElement ?? null;
  while (el) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 8) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

export function isNearScrollBottom(element: HTMLElement | null, thresholdPx = 140): boolean {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight <= thresholdPx;
}

export function scrollCommentsToEnd(
  anchor: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth',
): void {
  const container = getScrollableParent(anchor);
  if (container) {
    container.scrollTo({ top: container.scrollHeight, behavior });
    return;
  }
  anchor?.scrollIntoView({ behavior, block: 'end' });
}

export function shouldAutoScrollComments(anchor: HTMLElement | null): boolean {
  const container = getScrollableParent(anchor);
  return isNearScrollBottom(container);
}
