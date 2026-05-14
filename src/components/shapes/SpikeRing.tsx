import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Spike-ring — a circle with n outward triangular spikes (sun / gear look).
 *
 * Reads from config.params:
 *   spikeCount — number of spikes, 4-16
 *   spikeDepth — spike length as fraction of inner radius, 0.15-0.6 (default 0.35)
 */
export function SpikeRing({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2
  const rOuter = (box / 2) * 0.9 * config.size
  const n = Math.max(4, Math.min(16, Math.round(config.params.spikeCount ?? 8)))
  const depth = Math.max(0.15, Math.min(0.6, config.params.spikeDepth ?? 0.35))
  const rInner = rOuter * (1 - depth)

  // 2n vertices alternating between inner and outer; spike tip at outer
  // Slight offset so spikes are at top
  const verts: string[] = []
  const tipOffset = -Math.PI / 2
  // Spike width: gap between two adjacent inner points = 2π / n,
  //   spike base spans a fraction (say 0.5) of that
  const spikeHalfAngle = (Math.PI / n) * 0.5
  for (let i = 0; i < n; i++) {
    const center = tipOffset + (i / n) * 2 * Math.PI
    // Left base (inner)
    let a = center - (Math.PI / n) + spikeHalfAngle
    verts.push(
      `${(cx + rInner * Math.cos(a)).toFixed(2)},${(cy + rInner * Math.sin(a)).toFixed(2)}`,
    )
    // Tip (outer)
    verts.push(
      `${(cx + rOuter * Math.cos(center)).toFixed(2)},${(cy + rOuter * Math.sin(center)).toFixed(2)}`,
    )
    // Right base (inner)
    a = center + (Math.PI / n) - spikeHalfAngle
    verts.push(
      `${(cx + rInner * Math.cos(a)).toFixed(2)},${(cy + rInner * Math.sin(a)).toFixed(2)}`,
    )
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      <polygon
        points={verts.join(' ')}
        fill={config.fill ?? 'none'}
        stroke={config.stroke}
        strokeWidth={config.strokeWidth}
        strokeLinejoin="round"
      />
    </g>
  )
}
