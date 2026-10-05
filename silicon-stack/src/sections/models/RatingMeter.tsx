import type { Rating } from '../../data/industry'

const level: Record<Rating, number> = { Low: 1, Medium: 2, High: 3 }

export function RatingMeter({ rating, color }: { rating: Rating; color: string }) {
  const n = level[rating]
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-1.5 rounded-sm"
            style={{ height: 6 + i * 4, background: i <= n ? color : 'rgb(255 255 255 / 0.12)' }}
          />
        ))}
      </span>
      <span className="font-semibold text-fg">{rating}</span>
    </span>
  )
}
