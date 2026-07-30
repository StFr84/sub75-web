export function formatMinSec(n: number): string {
  return `${Math.floor(n)}:${Math.round((n % 1) * 60).toString().padStart(2, '0')}`
}
