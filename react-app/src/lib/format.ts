/** Angular DatePipe 'longDate' (en-US), e.g. "October 22, 2026". */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Angular DefaultImagePipe. */
export function defaultImage(image: string | null | undefined): string {
  return image || '/assets/default-avatar.svg';
}
