import { useState } from 'react'
import type { ShapeConfig, ShapeKind } from '../../types/puzzle'
import { Shape } from '../shapes/Shape'
import { STROKE_PALETTE, packSectorPatterns, unpackSectorPatterns } from '../../logic/generator'

interface Props {
  config: ShapeConfig
  onChange: (next: ShapeConfig) => void
  /** Visual label for the cell (e.g. "[0,0]" or "Cevap"). */
  label?: string
  /** If true, hides the live preview at the top. */
  hidePreview?: boolean
}

/** Shape display label for the dropdown (Turkish + technical name).
 *  Note: `cube-stack`, `reflection-source`, and `paper-fold-source` are
 *  intentionally omitted — they are virtual ShapeKinds used only by Cube
 *  Projection / Reflection / Paper Folding puzzle types respectively
 *  (which build their own data, not per-cell ShapeConfig). */
const SHAPE_LABELS: Record<Exclude<ShapeKind, 'cube-stack' | 'reflection-source' | 'paper-fold-source'>, string> = {
  annulus: 'Halkalar (Annulus)',
  dice: 'Zar (Dice)',
  polygon: 'Çokgen (Polygon)',
  star: 'Yıldız (Star)',
  arrow: 'Ok (Arrow)',
  petals: 'Çiçek (Petals)',
  'spike-ring': 'Dikenli Halka (Spike-Ring)',
  hammer: 'Çekiç (Hammer)',
  bars: 'Çizgiler (Bars)',
  'grid-dots': 'Nokta Izgarası (Grid-Dots)',
  checkerboard: 'Kareli Tahta (Checkerboard)',
  'nested-polygon': 'İç İçe Çokgen (Nested-Polygon)',
  'sector-pie': 'Pasta Dilim (Sector-Pie)',
  'box-lines': 'Kutu Çizgileri (Box-Lines)',
  'block-letter': 'Blok Glyph (F/L/T)',
}

const SHAPE_KINDS = Object.keys(SHAPE_LABELS) as ShapeKind[]

/**
 * Definition of every shape-specific parameter the editor knows how to
 * surface. The primary param is shown in the basic section; secondary params
 * appear under "Gelişmiş ayarlar".
 */
interface ParamDef {
  name: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
  primary?: boolean
}

const SHAPE_PARAMS: Record<Exclude<ShapeKind, 'cube-stack' | 'reflection-source' | 'paper-fold-source'>, ParamDef[]> = {
  annulus: [
    { name: 'ringCount', label: 'Halka Sayısı', min: 1, max: 4, step: 1, defaultValue: 2, primary: true },
    { name: 'gap', label: 'Halka Aralığı', min: 0.05, max: 0.3, step: 0.01, defaultValue: 0.15 },
  ],
  dice: [
    { name: 'dotCount', label: 'Nokta Sayısı', min: 1, max: 9, step: 1, defaultValue: 3, primary: true },
  ],
  polygon: [
    { name: 'sides', label: 'Kenar Sayısı', min: 3, max: 12, step: 1, defaultValue: 5, primary: true },
  ],
  star: [
    { name: 'points', label: 'Köşe Sayısı', min: 4, max: 10, step: 1, defaultValue: 5, primary: true },
    { name: 'innerRatio', label: 'İç Yarıçap Oranı', min: 0.2, max: 0.7, step: 0.05, defaultValue: 0.4 },
  ],
  arrow: [
    { name: 'headRatio', label: 'Uç Boyutu', min: 0.25, max: 0.7, step: 0.05, defaultValue: 0.4, primary: true },
    { name: 'shaftWidth', label: 'Gövde Kalınlığı', min: 0.15, max: 0.6, step: 0.05, defaultValue: 0.35 },
  ],
  petals: [
    { name: 'petalCount', label: 'Yaprak Sayısı', min: 3, max: 12, step: 1, defaultValue: 6, primary: true },
    { name: 'petalWidth', label: 'Yaprak Genişliği', min: 0.04, max: 0.4, step: 0.02, defaultValue: 0.12 },
  ],
  'spike-ring': [
    { name: 'spikeCount', label: 'Diken Sayısı', min: 4, max: 16, step: 1, defaultValue: 8, primary: true },
    { name: 'spikeDepth', label: 'Diken Derinliği', min: 0.15, max: 0.6, step: 0.05, defaultValue: 0.35 },
  ],
  hammer: [
    { name: 'handleLength', label: 'Sap Uzunluğu', min: 0.3, max: 0.8, step: 0.05, defaultValue: 0.55, primary: true },
    { name: 'headWidth', label: 'Başlık Genişliği', min: 0.4, max: 0.75, step: 0.05, defaultValue: 0.6 },
    { name: 'headThickness', label: 'Başlık Kalınlığı', min: 0.1, max: 0.25, step: 0.02, defaultValue: 0.18 },
    { name: 'markerPos', label: 'Marker Konumu (0=yok,1-4=köşe)', min: 0, max: 4, step: 1, defaultValue: 0 },
    { name: 'markerSize', label: 'Marker Boyutu', min: 0.05, max: 0.18, step: 0.01, defaultValue: 0.1 },
  ],
  bars: [
    { name: 'barCount', label: 'Çizgi Sayısı', min: 1, max: 6, step: 1, defaultValue: 3, primary: true },
    { name: 'orientation', label: 'Yön (0=yatay,1=dikey,2=diag)', min: 0, max: 2, step: 1, defaultValue: 0 },
  ],
  'grid-dots': [
    { name: 'rows', label: 'Satır Sayısı', min: 1, max: 4, step: 1, defaultValue: 2, primary: true },
    { name: 'cols', label: 'Sütun Sayısı', min: 1, max: 4, step: 1, defaultValue: 2 },
    { name: 'dotSize', label: 'Nokta Boyutu', min: 0.03, max: 0.14, step: 0.01, defaultValue: 0.07 },
  ],
  checkerboard: [
    { name: 'rows', label: 'Satır', min: 1, max: 4, step: 1, defaultValue: 3, primary: true },
    { name: 'cols', label: 'Sütun', min: 1, max: 4, step: 1, defaultValue: 3 },
  ],
  'nested-polygon': [
    { name: 'outerSides', label: 'Dış Kenar Sayısı', min: 3, max: 8, step: 1, defaultValue: 4, primary: true },
    { name: 'innerSides', label: 'İç Kenar Sayısı', min: 3, max: 8, step: 1, defaultValue: 4 },
    { name: 'innerScale', label: 'İç Ölçek', min: 0.25, max: 0.75, step: 0.05, defaultValue: 0.5 },
  ],
  'sector-pie': [
    { name: 'sectorCount', label: 'Dilim Sayısı', min: 2, max: 8, step: 1, defaultValue: 4, primary: true },
  ],
  'box-lines': [],
  'block-letter': [
    { name: 'patternIndex', label: 'Glyph (0-7: F/L/T/P/J/S/Z…)', min: 0, max: 7, step: 1, defaultValue: 0, primary: true },
  ],
}

/** Default param dictionary for a given shape kind. */
function defaultParamsFor(kind: ShapeKind): Record<string, number> {
  const out: Record<string, number> = {}
  const defs = (SHAPE_PARAMS as Record<string, ParamDef[]>)[kind] ?? []
  for (const p of defs) {
    out[p.name] = p.defaultValue
  }
  // Special: sector-pie has a packed sectorPatterns field
  if (kind === 'sector-pie') {
    // Default: all sectors solid (pattern 1)
    out.sectorPatterns = packSectorPatterns([1, 1, 1, 1])
  }
  // Special: checkerboard pattern bit-mask
  if (kind === 'checkerboard') {
    out.pattern = 0b101010101 // diagonal-ish default
  }
  // Special: box-lines lineMask
  if (kind === 'box-lines') {
    out.lineMask = 0
  }
  return out
}

const PATTERN_LABELS = ['boş', 'dolu', 'noktalı', 'yatay', 'dikey', 'diag \\', 'diag /', 'çapraz']

export function CellEditor({ config, onChange, label, hidePreview }: Props) {
  const [advanced, setAdvanced] = useState(false)

  // Cast away cube-stack: it's never reachable here (SHAPE_KINDS dropdown
  // excludes it). Fall back to [] if we somehow get an unknown kind.
  const paramDefs =
    (SHAPE_PARAMS as Record<string, ParamDef[]>)[config.kind] ?? []
  const primary = paramDefs.find((p) => p.primary)
  const secondary = paramDefs.filter((p) => !p.primary)

  const updateParam = (name: string, value: number) =>
    onChange({ ...config, params: { ...config.params, [name]: value } })

  const setKind = (kind: ShapeKind) =>
    onChange({
      ...config,
      kind,
      params: defaultParamsFor(kind),
      // Reset rotation if new shape has high symmetry
      rotation: 0,
    })

  return (
    <div className="space-y-3">
      {label && (
        <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      )}

      {/* Live preview */}
      {!hidePreview && (
        <div className="flex justify-center p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]">
          <Shape config={config} px={120} />
        </div>
      )}

      {/* Shape kind */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Şekil</label>
        <select
          value={config.kind}
          onChange={(e) => setKind(e.target.value as ShapeKind)}
          className="w-full px-2 py-1.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm"
        >
          {SHAPE_KINDS.map((k) => (
            <option key={k} value={k}>
              {(SHAPE_LABELS as Record<string, string>)[k] ?? k}
            </option>
          ))}
        </select>
      </div>

      {/* Primary param (sayısal slider) */}
      {primary && (
        <ParamSlider
          def={primary}
          value={config.params[primary.name] ?? primary.defaultValue}
          onChange={(v) => updateParam(primary.name, v)}
        />
      )}

      {/* Rotation */}
      <ParamSlider
        def={{ name: 'rotation', label: 'Döndürme (derece)', min: 0, max: 359, step: 15, defaultValue: 0 }}
        value={config.rotation}
        onChange={(v) => onChange({ ...config, rotation: v })}
      />

      {/* Color */}
      <div>
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Renk</label>
        <div className="flex gap-2 flex-wrap">
          {STROKE_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...config, stroke: c })}
              className={`w-7 h-7 rounded-full border-2 transition ${
                config.stroke === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setAdvanced((v) => !v)}
        className="w-full text-left text-xs text-[var(--color-accent)] hover:underline pt-2"
      >
        {advanced ? '▾' : '▸'} Gelişmiş ayarlar
      </button>

      {advanced && (
        <div className="space-y-3 pt-1 pl-2 border-l-2 border-[var(--color-border)]">
          <ParamSlider
            def={{ name: 'size', label: 'Boyut', min: 0.3, max: 1.0, step: 0.05, defaultValue: 0.75 }}
            value={config.size}
            onChange={(v) => onChange({ ...config, size: v })}
          />

          <ParamSlider
            def={{ name: 'strokeWidth', label: 'Çizgi Kalınlığı', min: 1, max: 6, step: 0.5, defaultValue: 3 }}
            value={config.strokeWidth}
            onChange={(v) => onChange({ ...config, strokeWidth: v })}
          />

          <div>
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={config.fill !== null}
                onChange={(e) => onChange({ ...config, fill: e.target.checked ? config.stroke : null })}
              />
              <span>Dolu (fill ile)</span>
            </label>
          </div>

          {/* Secondary numeric params */}
          {secondary.map((p) => (
            <ParamSlider
              key={p.name}
              def={p}
              value={config.params[p.name] ?? p.defaultValue}
              onChange={(v) => updateParam(p.name, v)}
            />
          ))}

          {/* Sector-pie özel: her dilim için pattern */}
          {config.kind === 'sector-pie' && (
            <SectorPatternEditor config={config} onChange={onChange} />
          )}

          {/* Checkerboard özel: bit-mask grid tıklama */}
          {config.kind === 'checkerboard' && (
            <CheckerboardMaskEditor config={config} onChange={onChange} />
          )}

          {/* Box-lines özel: 6-bit edge mask */}
          {config.kind === 'box-lines' && (
            <BoxLinesMaskEditor config={config} onChange={onChange} />
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Reusable sub-controls
// ──────────────────────────────────────────────────────────────

interface SliderProps {
  def: ParamDef
  value: number
  onChange: (v: number) => void
}

function ParamSlider({ def, value, onChange }: SliderProps) {
  const isInt = def.step === 1
  const display = isInt ? Math.round(value).toString() : value.toFixed(2)
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-[var(--color-text-muted)]">{def.label}</label>
        <span className="text-xs tabular-nums text-[var(--color-text)]">{display}</span>
      </div>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </div>
  )
}

function SectorPatternEditor({ config, onChange }: { config: ShapeConfig; onChange: (c: ShapeConfig) => void }) {
  const sectorCount = Math.round(config.params.sectorCount ?? 4)
  const patterns = unpackSectorPatterns(config.params.sectorPatterns ?? 0, sectorCount)

  const setPattern = (idx: number, val: number) => {
    const next = [...patterns]
    next[idx] = val
    onChange({
      ...config,
      params: { ...config.params, sectorPatterns: packSectorPatterns(next) },
    })
  }

  return (
    <div>
      <label className="block text-xs text-[var(--color-text-muted)] mb-1">Dilim Desenleri</label>
      <div className="space-y-1">
        {Array.from({ length: sectorCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs w-8 text-[var(--color-text-muted)]">#{i + 1}</span>
            <select
              value={patterns[i] ?? 0}
              onChange={(e) => setPattern(i, parseInt(e.target.value, 10))}
              className="flex-1 px-1.5 py-1 text-xs rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]"
            >
              {PATTERN_LABELS.map((label, p) => (
                <option key={p} value={p}>{p} — {label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

function CheckerboardMaskEditor({ config, onChange }: { config: ShapeConfig; onChange: (c: ShapeConfig) => void }) {
  const rows = Math.round(config.params.rows ?? 3)
  const cols = Math.round(config.params.cols ?? 3)
  const pattern = Math.round(config.params.pattern ?? 0)

  const toggle = (r: number, c: number) => {
    const bit = 1 << (r * cols + c)
    const next = pattern ^ bit
    onChange({ ...config, params: { ...config.params, pattern: next } })
  }

  return (
    <div>
      <label className="block text-xs text-[var(--color-text-muted)] mb-1">Hücre Doluluk (tıkla)</label>
      <div
        className="inline-grid gap-0.5 p-1 bg-[var(--color-surface-2)] rounded border border-[var(--color-border)]"
        style={{ gridTemplateColumns: `repeat(${cols}, 1.5rem)` }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => {
          const r = Math.floor(i / cols)
          const c = i % cols
          const filled = (pattern >> (r * cols + c)) & 1
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(r, c)}
              className={`w-6 h-6 rounded-sm border border-[var(--color-border)] transition ${
                filled ? 'bg-[var(--color-accent)]' : 'bg-transparent hover:bg-[var(--color-border)]'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}

const BOX_LINE_LABELS = ['Sol', 'Sağ', 'Üst', 'Alt', 'Diag \\', 'Diag /']

function BoxLinesMaskEditor({ config, onChange }: { config: ShapeConfig; onChange: (c: ShapeConfig) => void }) {
  const mask = Math.round(config.params.lineMask ?? 0)
  const toggleBit = (b: number) =>
    onChange({ ...config, params: { ...config.params, lineMask: mask ^ (1 << b) } })
  return (
    <div>
      <label className="block text-xs text-[var(--color-text-muted)] mb-1">Çizgiler</label>
      <div className="grid grid-cols-2 gap-1">
        {BOX_LINE_LABELS.map((label, b) => (
          <label key={b} className="flex items-center gap-1 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={!!(mask & (1 << b))}
              onChange={() => toggleBit(b)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
