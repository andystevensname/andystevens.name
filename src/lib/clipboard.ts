// Copies `text` to the clipboard and flashes a `data-copied` attribute on
// `btn` for 1.5s — CSS keys the "copied" affordance off that attribute.
// Returns whether the write succeeded.
export async function copyToClipboard(btn: HTMLElement, text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    btn.dataset.copied = '';
    setTimeout(() => delete btn.dataset.copied, 1500);
    return true;
  } catch {
    return false;
  }
}
