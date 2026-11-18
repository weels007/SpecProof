export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
