import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Sector-Pie — disk divided into N equal sectors, each filled or empty per
 * a bit-mask. Ideal carrier for AND/OR/XOR bit-pattern rules.
 *
 * Reads from config.params:
 *   sectorCount — number of equal sectors, 2-8
 *   fillMask    — bit-mask: bit i = sector i is filled (0..2^N - 1)
 *
 * Symmetry: depends on the mask but conservatively fold=1.
 */
export function SectorPie({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2
  const r = (box / 2) * 0.85 * config.size
  const sectorCount = Math.max(2, Math.min(8, Math.round(config.params.sectorCount ?? 4)))
  const maxMask = (1 << sectorCount) - 1
  const fillMask = Math.max(0, Math.min(maxMask, Math.round(config.params.fillMask ?? 0)))

  // Build sector paths
  const paths: Array<{ d: string; filled: boolean }> = []
  for (let i = 0; i < sectorCount; i++) {
    const a0 = (i / sectorCount) * 2 * Math.PI - Math.PI / 2
    const a1 = ((i + 1) / sectorCount) * 2 * Math.PI - Math.PI / 2
    const x0 = cx + r * Math.cos(a0)
    const y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    // Large arc flag: 0 since each sector is < π (when sectorCount >= 2)
    const largeArc = (a1 - a0) > Math.PI ? 1 : 0
    const d = `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
    paths.push({ d, filled: (fillMask & (1 << i)) !== 0 })
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      {/* Filled sectors first, so the outer outline overlays cleanly */}
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.filled ? config.stroke : 'none'}
          stroke={config.stroke}
          strokeWidth={Math.max(0.5, config.strokeWidth * 0.7)}
        />
      ))}
      {/* Outer circle border for clarity */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={config.stroke}
        strokeWidth={config.strokeWidth}
      />
    </g>
  )
}
