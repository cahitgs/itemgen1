import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  /** Container size in viewBox units; default 100. */
  box?: number
}

/**
 * Concentric rings (halkalar). Like Corvus's annulus but cleaner.
 *
 * Reads from config.params:
 *   ringCount  — how many concentric rings (1–4)
 *   gap        — relative gap between rings (0–1, default 0.15)
 */
export function Annulus({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2
  const baseR = (box / 2) * 0.9 * config.size
  const ringCount = Math.max(1, Math.min(4, config.params.ringCount ?? 1))
  const gap = config.params.gap ?? 0.15

  const rings = []
  for (let i = 0; i < ringCount; i++) {
    const r = baseR * (1 - i * gap)
    if (r <= 0) break
    rings.push(
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill={i === 0 ? config.fill ?? 'none' : 'none'}
        stroke={config.stroke}
        strokeWidth={config.strokeWidth}
      />,
    )
  }

  return <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>{rings}</g>
}
