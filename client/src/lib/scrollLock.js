/**
 * One page-scroll lock shared by everything that covers the page.
 *
 * The intro curtain and the first-visit language dialog open together, and
 * each used to save body.style.overflow and put it back on close. The
 * curtain closes first and restores "", then the dialog restores the
 * "hidden" it had saved - and the page could never scroll again, for every
 * new visitor. A counter makes the order irrelevant: the page is unlocked
 * when the last holder lets go.
 */
let holders = 0;
let saved = '';

export function lockScroll() {
  if (holders === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  holders += 1;
  let released = false;
  return function release() {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) document.body.style.overflow = saved === 'hidden' ? '' : saved;
  };
}
