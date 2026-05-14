import type { ShapeConfig } from '../../types/puzzle'
import { Annulus } from './Annulus'
import { Dice } from './Dice'
import { Polygon } from './Polygon'
import { Star } from './Star'
import { Arrow } from './Arrow'
import { Petals } from './Petals'
import { SpikeRing } from './SpikeRing'
import { Hammer } from './Hammer'
import { Bars } from './Bars'
import { GridDots } from './GridDots'
import { Checkerboard } from './Checkerboard'
import { BoxLines } from './BoxLines'

interface Props {
  config: ShapeConfig
  /** SVG viewBox size; defaults to 100×100. */
  box?: number
  /** Wrapping <svg> width/height in px. */
  px?: number
}

/**
 * Dispatcher: picks the right renderer for a ShapeConfig.
 * Adding a new shape:
 *   1) Build a Foo.tsx component in this directory
 *   2) Add it to the ShapeKind union in types/puzzle.ts
 *   3) Register the case here
 *   4) Add generator logic in logic/generator.ts
 */
export function Shape({ config, box = 100, px = 100 }: Props) {
  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${box} ${box}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {renderShape(config, box)}
    </svg>
  )
}

function renderShape(config: ShapeConfig, box: number) {
  switch (config.kind) {
    case 'annulus':
      return <Annulus config={config} box={box} />
    case 'dice':
      return <Dice config={config} box={box} />
    case 'polygon':
      return <Polygon config={config} box={box} />
    case 'star':
      return <Star config={config} box={box} />
    case 'arrow':
      return <Arrow config={config} box={box} />
    case 'petals':
      return <Petals config={config} box={box} />
    case 'spike-ring':
      return <SpikeRing config={config} box={box} />
    case 'hammer':
      return <Hammer config={config} box={box} />
    case 'bars':
      return <Bars config={config} box={box} />
    case 'grid-dots':
      return <GridDots config={config} box={box} />
    case 'checkerboard':
      return <Checkerboard config={config} box={box} />
    case 'box-lines':
      return <BoxLines config={config} box={box} />
    default:
      return (
        <text
          x={box / 2}
          y={box / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-text-muted)"
          fontSize={box * 0.15}
        >
          {config.kind}?
        </text>
      )
  }
}
