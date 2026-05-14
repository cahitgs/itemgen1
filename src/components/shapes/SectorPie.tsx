import { useId } from 'react'
import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Sector-Pie — disk divided into N equal sectors, each with its own fill pattern.
 *
 * Reads from config.params:
 *   sectorCount    — number of equal sectors, 2-8
 *   sectorPatterns — packed integer: 3 bits per sector (LSB first).
 *                    Each sector's 3-bit code (0-7) maps to a fill pattern:
 *                      0 = empty (no fill)
 *                      1 = solid (color fill)
 *                      2 = dots
 *                      3 = horizontal lines
 *                      4 = vertical lines
 *                      5 = diagonal '\' lines
 *                      6 = diagonal '/' lines
 *                      7 = cross-hatch (both diagonals)
 *
 *   Backward compat: if sectorPatterns is missing but fillMask is present,
 *   derive sectorPatterns where all filled sectors use pattern 1 (solid).
 */
export function SectorPie({ config, box = 100 }: Props) {
  // useId for unique SVG pattern element IDs — multiple SectorPie instances
  // on the same page must not clobber each other's <pattern> defs.
  const uidRaw = useId()
  const uid = uidRaw.replace(/[^a-zA-Z0-9]/g, '')

  const cx = box / 2
  const cy = box / 2
  const r = (box / 2) * 0.85 * config.size
  const sectorCount = Math.max(2, Math.min(8, Math.round(config.params.sectorCount ?? 4)))

  // Derive per-sector pattern IDs
  let packed = Math.round(config.params.sectorPatterns ?? 0)
  // Legacy fillMask fallback: if no sectorPatterns set, all filled = pattern 1
  if (packed === 0 && config.params.fillMask !== undefined) {
    const fillMask = Math.round(config.params.fillMask)
    for (let i = 0; i < sectorCount; i++) {
      if (fillMask & (1 << i)) packed |= 1 << (i * 3)
    }
  }

  const color = config.stroke
  const sw = Math.max(0.5, config.strokeWidth * 0.7)

  // Build sector paths + their pattern IDs
  const paths: Array<{ d: string; patternId: number }> = []
  for (let i = 0; i < sectorCount; i++) {
    const a0 = (i / sectorCount) * 2 * Math.PI - Math.PI / 2
    const a1 = ((i + 1) / sectorCount) * 2 * Math.PI - Math.PI / 2
    const x0 = cx + r * Math.cos(a0)
    const y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const largeArc = (a1 - a0) > Math.PI ? 1 : 0
    const d = `M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`
    const patternId = (packed >> (i * 3)) & 7
    paths.push({ d, patternId })
  }

  // Map patternId → fill attribute value
  const fillFor = (pid: number): string => {
    if (pid === 0) return 'none'
    if (pid === 1) return color
    return `url(#sp-${uid}-${pid})`
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      <defs>
        {/* Pattern 2 — dots */}
        <pattern id={`sp-${uid}-2`} patternUnits="userSpaceOnUse" width="6" height="6">
          <circle cx="3" cy="3" r="1.2" fill={color} />
        </pattern>
        {/* Pattern 3 — horizontal lines */}
        <pattern id={`sp-${uid}-3`} patternUnits="userSpaceOnUse" width="4" height="4">
          <line x1="0" y1="2" x2="4" y2="2" stroke={color} strokeWidth="1" />
        </pattern>
        {/* Pattern 4 — vertical lines */}
        <pattern id={`sp-${uid}-4`} patternUnits="userSpaceOnUse" width="4" height="4">
          <line x1="2" y1="0" x2="2" y2="4" stroke={color} strokeWidth="1" />
        </pattern>
        {/* Pattern 5 — diagonal \ */}
        <pattern id={`sp-${uid}-5`} patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="0" y1="0" x2="6" y2="6" stroke={color} strokeWidth="1" />
        </pattern>
        {/* Pattern 6 — diagonal / */}
        <pattern id={`sp-${uid}-6`} patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="0" y1="6" x2="6" y2="0" stroke={color} strokeWidth="1" />
        </pattern>
        {/* Pattern 7 — cross-hatch */}
        <pattern id={`sp-${uid}-7`} patternUnits="userSpaceOnUse" width="6" height="6">
          <line x1="0" y1="0" x2="6" y2="6" stroke={color} strokeWidth="1" />
          <line x1="0" y1="6" x2="6" y2="0" stroke={color} strokeWidth="1" />
        </pattern>
      </defs>

      {/* Sectors */}
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={fillFor(p.patternId)}
          stroke={color}
          strokeWidth={sw}
        />
      ))}

      {/* Outer circle border */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={config.strokeWidth}
      />
    </g>
  )
}
