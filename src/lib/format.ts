export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export function formatValue(value: number, activityType: string): string {
  if (activityType === "time_trial") return formatTime(value)
  return `${value} lbs`
}

export function formatGain(gain: number | null): string {
  if (gain === null) return "—"
  const sign = gain >= 0 ? "+" : ""
  return `${sign}${gain.toFixed(1)}%`
}
