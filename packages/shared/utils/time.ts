export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}
