import type { ShapeConfig } from '../../types/puzzle'

interface Props {
  config: ShapeConfig
  box?: number
}

/**
 * Asymmetric block-letter shape — a 3×3 grid where filled cells form an
 * asymmetric pattern (F, L, T, P, J, S, Z, or similar tetromino-like glyph).
 *
 * Every preset is asymmetric under both horizontal AND vertical mirror,
 * which makes this an ideal carrier for the Reflection puzzle type: any
 * flip clearly differs from the original.
 *
 * Reads from config.params:
 *   patternIndex — 0..N-1, picks one of the preset patterns
 *
 * The 3×3 grid is rendered as 9 outlined cells; filled cells get an inset
 * colored rect (same trick as Checkerboard so adjacent cells stay distinct).
 */

/** 3×3 asymmetric patterns. Each is a 9-bit integer, bit i = row(i/3) col(i%3),
 *  top-left = bit 0.
 *
 *  Patterns hand-picked to be asymmetric under both horizontal and vertical
 *  mirror — flipping them produces a visibly different shape. */
const PRESETS: number[] = [
  // F (top corner)
  // ###
  // #..
  // ##.
  0b011_001_111,
  // L
  // #..
  // #..
  // ###
  0b111_001_001,
  // Reverse-F (mirror of F — yes intentional, distinct preset)
  // ###
  // ..#
  // .##
  0b110_100_111,
  // P
  // ##.
  // ##.
  // #..
  0b001_011_011,
  // J (mirror of L)
  // ..#
  // ..#
  // ###
  0b111_100_100,
  // T-with-foot
  // ###
  // .#.
  // #..
  0b001_010_111,
  // Z-ish
  // ##.
  // .##
  // ..#
  0b100_110_011,
  // S-ish (mirror of Z)
  // .##
  // ##.
  // #..
  0b001_011_110,
]

export const BLOCK_LETTER_PRESET_COUNT = PRESETS.length

export function BlockLetter({ config, box = 100 }: Props) {
  const cx = box / 2
  const cy = box / 2

  const idx = Math.max(0, Math.min(PRESETS.length - 1, Math.round(config.params.patternIndex ?? 0)))
  const pattern = PRESETS[idx]

  const scale = config.size
  const innerSize = box * 0.78 * scale
  const cell = innerSize / 3
  const startX = cx - innerSize / 2
  const startY = cy - innerSize / 2

  const inset = Math.max(1.5, cell * 0.1)
  const outlineW = Math.max(0.8, config.strokeWidth * 0.6)

  const cells: Array<{ r: number; c: number; filled: boolean }> = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const bitIdx = r * 3 + c
      cells.push({ r, c, filled: (pattern & (1 << bitIdx)) !== 0 })
    }
  }

  return (
    <g transform={`rotate(${config.rotation} ${cx} ${cy})`}>
      {cells.map((cell, i) => {
        const x = startX + cell.c * (innerSize / 3)
        const y = startY + cell.r * (innerSize / 3)
        const w = innerSize / 3
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={w}
              height={w}
              fill="none"
              stroke={config.stroke}
              strokeWidth={outlineW}
              opacity={0.3}
            />
            {cell.filled && (
              <rect
                x={x + inset}
                y={y + inset}
                width={w - inset * 2}
                height={w - inset * 2}
                fill={config.stroke}
                stroke={config.stroke}
                strokeWidth={outlineW * 0.5}
              />
            )}
          </g>
        )
      })}
    </g>
  )
}
