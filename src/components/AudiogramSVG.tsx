import { airConductionPath, plottedLevel, OCTAVE_FREQUENCIES } from '@/lib/examPlot';
import { frequencyOctaveOffset } from '@/lib/clinicalProtocol';
import React from 'react';
import { EarTonalData } from '@/db/db';

interface Props {
  rightData?: Partial<EarTonalData>;
  leftData?: Partial<EarTonalData>;
  baselineRightData?: Partial<EarTonalData>;
  baselineLeftData?: Partial<EarTonalData>;
  freeFieldData?: Partial<EarTonalData>;
  onPointClick?: (freq: string, db: number) => void;
}

const FREQUENCIES = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
const FREQ_OFFSETS: Record<string, number> = Object.fromEntries(FREQUENCIES.map(frequency => [frequency, frequencyOctaveOffset(frequency)]));

const WIDTH = 600;
const HEIGHT = 600;
const MARGIN = { top: 40, right: 60, bottom: 40, left: 60 };
const INNER_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

const getX = (freq: string) => MARGIN.left + (FREQ_OFFSETS[freq] / 6) * INNER_WIDTH;
const getY = (dbVal: number) => MARGIN.top + ((dbVal + 10) / 130) * INNER_HEIGHT;

// Inverse functions for interaction
const getFreqFromX = (x: number): string => {
  const normalizedX = (x - MARGIN.left) / INNER_WIDTH * 6;
  let closestFreq = '1000';
  let minDiff = Infinity;
  for (const [freq, offset] of Object.entries(FREQ_OFFSETS)) {
    if (!FREQUENCIES.includes(freq)) continue;
    const diff = Math.abs(offset - normalizedX);
    if (diff < minDiff) {
      minDiff = diff;
      closestFreq = freq;
    }
  }
  return closestFreq;
};

const getDbFromY = (y: number): number => {
  const normalizedY = (y - MARGIN.top) / INNER_HEIGHT;
  const dbVal = (normalizedY * 130) - 10;
  // Snap to nearest 5 dB
  const snappedDb = Math.round(dbVal / 5) * 5;
  return Math.max(-10, Math.min(120, snappedDb));
};

export default function AudiogramSVG({ rightData, leftData, baselineRightData, baselineLeftData, freeFieldData, onPointClick }: Props) {
  const processCoordinates = (clientX: number, clientY: number, currentTarget: SVGSVGElement) => {
    if (!onPointClick) return;
    const matrix = currentTarget.getScreenCTM();
    if (!matrix) return;
    const position = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    const svgX = position.x, svgY = position.y;
    if (svgX < MARGIN.left || svgX > WIDTH - MARGIN.right) return;
    if (svgY < MARGIN.top || svgY > HEIGHT - MARGIN.bottom) return;

    const freq = getFreqFromX(svgX);
    const db = getDbFromY(svgY);
    onPointClick(freq, db);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    processCoordinates(e.clientX, e.clientY, e.currentTarget);
  };

  const renderGrid = () => {
    const lines = [];
    // Y Grid lines (-10 to 120 in steps of 10)
    for (let db = -10; db <= 120; db += 10) {
      const y = getY(db);
      lines.push(
        <line key={`hy_${db}`} x1={MARGIN.left} y1={y} x2={WIDTH - MARGIN.right} y2={y} stroke={db === 0 ? "#94a3b8" : "#e2e8f0"} strokeWidth={db === 0 ? 2 : 1} />
      );
      lines.push(
        <text key={`hy_t_${db}`} x={MARGIN.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b" style={{ pointerEvents: 'none' }}>
          {db}
        </text>
      );
    }
    // X Grid lines
    FREQUENCIES.forEach(freq => {
      const x = getX(freq);
      lines.push(
        <line key={`vx_${freq}`} x1={x} y1={MARGIN.top} x2={x} y2={HEIGHT - MARGIN.bottom} stroke="#e2e8f0" strokeWidth="1" strokeDasharray={OCTAVE_FREQUENCIES.has(freq) ? undefined : "3,3"} />
      );
      lines.push(
        <text key={`vx_t_${freq}`} x={x} y={MARGIN.top - 10} textAnchor="middle" fontSize="12" fill="#64748b" style={{ pointerEvents: 'none' }}>
          {freq}
        </text>
      );
    });
    return lines;
  };

  const renderPath = (data: Partial<EarTonalData> | undefined, color: string, dasharray: string, opacity: number = 1) => {
    if (!data) return null;
    const path = airConductionPath(data, getX, getY);
    if (!path) return null;
    return <path d={path} fill="none" stroke={color} strokeWidth="2" strokeDasharray={dasharray} strokeOpacity={opacity} style={{ pointerEvents: 'none' }} />;
  };

  const renderSymbol = (x: number, y: number, type: string, color: string, isNR: boolean, offsetDirection: 1 | 0 | -1) => {
    let symbol;
    switch (type) {
      case 'OD_VA': // O
        symbol = <circle cx={x} cy={y} r={6} fill="none" stroke={color} strokeWidth="2" />;
        break;
      case 'OD_VA_MASK': // Δ
        symbol = <polygon points={`${x},${y-7} ${x-7},${y+5} ${x+7},${y+5}`} fill="none" stroke={color} strokeWidth="2" />;
        break;
      case 'OE_VA': // X
        symbol = (
          <g stroke={color} strokeWidth="2">
            <line x1={x-6} y1={y-6} x2={x+6} y2={y+6} />
            <line x1={x+6} y1={y-6} x2={x-6} y2={y+6} />
          </g>
        );
        break;
      case 'OE_VA_MASK': // □
        symbol = <rect x={x-6} y={y-6} width={12} height={12} fill="none" stroke={color} strokeWidth="2" />;
        break;
      case 'OD_VO': // <
        symbol = <polyline points={`${x+6},${y-8} ${x-4},${y} ${x+6},${y+8}`} fill="none" stroke={color} strokeWidth="2" />;
        break;
      case 'OD_VO_MASK': // [
        symbol = <polyline points={`${x+4},${y-8} ${x-4},${y-8} ${x-4},${y+8} ${x+4},${y+8}`} fill="none" stroke={color} strokeWidth="2" />;
        break;
      case 'OE_VO': // >
        symbol = <polyline points={`${x-6},${y-8} ${x+4},${y} ${x-6},${y+8}`} fill="none" stroke={color} strokeWidth="2" />;
        break;
      case 'OE_VO_MASK': // ]
        symbol = <polyline points={`${x-4},${y-8} ${x+4},${y-8} ${x+4},${y+8} ${x-4},${y+8}`} fill="none" stroke={color} strokeWidth="2" />;
        break;
      case 'FREE_FIELD': // S
        symbol = <text x={x} y={y+5} textAnchor="middle" fontSize="16" fontWeight="bold" fill={color}>S</text>;
        break;
    }

    if (type === 'FREE_FIELD' || type === 'OD_VO' || type === 'OE_VO') offsetDirection = 0;
    return (
      <g key={`${x}-${y}-${type}`} style={{ pointerEvents: 'none' }}>
        {symbol}
        {isNR && (
          <g stroke={color} strokeWidth="2" fill="none">
            <line x1={x + (offsetDirection * 6)} y1={y + 8} x2={x + (offsetDirection * 15)} y2={y + 19} />
            <polyline points={offsetDirection === 0 ? `${x-4},${y+15} ${x},${y+19} ${x+4},${y+15}` : `${x + offsetDirection*15},${y+14} ${x + offsetDirection*15},${y+19} ${x + offsetDirection*10},${y+19}`} />
          </g>
        )}
      </g>
    );
  };

  const renderDataPoints = (rData?: Partial<EarTonalData>, lData?: Partial<EarTonalData>, opacity: number = 1) => {
    const points: React.ReactNode[] = [];
    FREQUENCIES.forEach(freq => {
      const x = getX(freq);
      
      // OD
      const r = rData?.[freq as keyof EarTonalData];
      if (r) {
        if (plottedLevel(r, 'va') !== null) {
          const isNR = r.va === 'NR';
          const y = getY(plottedLevel(r, 'va')!);
          points.push(
            <g key={`od-va-${x}-${y}`} style={{ opacity }}>
              {renderSymbol(x, y, r.maskedVa ? 'OD_VA_MASK' : 'OD_VA', '#ef4444', isNR, -1)}
            </g>
          );
        }
        if (plottedLevel(r, 'vo') !== null) {
          const isNR = r.vo === 'NR';
          const y = getY(plottedLevel(r, 'vo')!);
          points.push(
            <g key={`od-vo-${x}-${y}`} style={{ opacity }}>
              {renderSymbol(x - 8, y, r.maskedVo ? 'OD_VO_MASK' : 'OD_VO', '#ef4444', isNR, -1)}
            </g>
          );
        }
      }

      // OE
      const l = lData?.[freq as keyof EarTonalData];
      if (l) {
        if (plottedLevel(l, 'va') !== null) {
          const isNR = l.va === 'NR';
          const y = getY(plottedLevel(l, 'va')!);
          points.push(
            <g key={`oe-va-${x}-${y}`} style={{ opacity }}>
              {renderSymbol(x, y, l.maskedVa ? 'OE_VA_MASK' : 'OE_VA', '#3b82f6', isNR, 1)}
            </g>
          );
        }
        if (plottedLevel(l, 'vo') !== null) {
          const isNR = l.vo === 'NR';
          const y = getY(plottedLevel(l, 'vo')!);
          points.push(
            <g key={`oe-vo-${x}-${y}`} style={{ opacity }}>
              {renderSymbol(x + 8, y, l.maskedVo ? 'OE_VO_MASK' : 'OE_VO', '#3b82f6', isNR, 1)}
            </g>
          );
        }
      }
    });
    return points;
  };

  const renderFreeFieldPoints = (data?: Partial<EarTonalData>) => {
    if (!data) return null;
    const points: React.ReactNode[] = [];
    FREQUENCIES.forEach(freq => {
      const x = getX(freq);
      const f = data[freq as keyof EarTonalData];
      if (f && plottedLevel(f, 'va') !== null) {
        const isNR = f.va === 'NR';
        const y = getY(plottedLevel(f, 'va')!);
        points.push(
          <g key={`ff-${x}-${y}`}>
            {renderSymbol(x, y, 'FREE_FIELD', '#10b981', isNR, 1)}
          </g>
        );
      }
    });
    return points;
  };

  return (
    <svg 
      role="img"
      aria-label="Audiograma: frequência em Hz e nível de audição em dB NA"
      id="audiogram-svg" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`} 
      className={`w-full max-w-full bg-white border rounded-md select-none ${onPointClick ? 'cursor-crosshair' : ''}`}
      style={{ touchAction: 'manipulation' }}
      onClick={handleSvgClick}
    >
      <title>Audiograma tonal · apenas valores registrados</title>
      <desc>OD: círculo ou triângulo mascarado. OE: X ou quadrado mascarado. Via óssea: chevrons ou colchetes mascarados. S: campo livre sem lateralidade. Seta: ausência de resposta no nível registrado. Via óssea sem mascaramento não identifica isoladamente a cóclea respondente.</desc>
      {/* Background click hitbox */}
      <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#ffffff" />
      <text x={WIDTH / 2} y={MARGIN.top - 25} textAnchor="middle" fontSize="14" fontWeight="bold" style={{ pointerEvents: 'none' }}>Frequência (Hz)</text>
      <text x={15} y={HEIGHT / 2} textAnchor="middle" fontSize="14" fontWeight="bold" transform={`rotate(-90, 15, ${HEIGHT/2})`} style={{ pointerEvents: 'none' }}>Nível de audição (dB NA)</text>
      
      {/* Grid */}
      {renderGrid()}
      
      {/* Baselines connecting VA points */}
      {renderPath(baselineRightData, '#ef4444', '0', 0.25)}
      {renderPath(baselineLeftData, '#3b82f6', '0', 0.25)}

      {/* Lines connecting VA points */}
      {renderPath(rightData, '#ef4444', '0')}
      {renderPath(leftData, '#3b82f6', '0')}
      {renderPath(freeFieldData, '#10b981', '0')}
      
      {/* Baseline Data points */}
      {renderDataPoints(baselineRightData, baselineLeftData, 0.25)}

      {/* Current Data points */}
      {renderDataPoints(rightData, leftData, 1)}
      {renderFreeFieldPoints(freeFieldData)}
    </svg>
  );
}
