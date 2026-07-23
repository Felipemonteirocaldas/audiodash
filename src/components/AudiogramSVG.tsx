import React from 'react';
import { EarTonalData } from '@/db/db';

interface Props {
  rightData: Partial<EarTonalData>;
  leftData: Partial<EarTonalData>;
  onPointClick?: (freq: string, db: number) => void;
}

const FREQUENCIES = ['125', '250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
const FREQ_OFFSETS: Record<string, number> = {
  '125': 0, '250': 1, '500': 2, '750': 2.5, '1000': 3, '1500': 3.5, '2000': 4, '3000': 4.5, '4000': 5, '6000': 5.5, '8000': 6
};

const WIDTH = 600;
const HEIGHT = 600;
const MARGIN = { top: 40, right: 40, bottom: 40, left: 60 };
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

export default function AudiogramSVG({ rightData, leftData, onPointClick }: Props) {
  
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPointClick) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;

    // Scale to viewBox
    const scaleX = WIDTH / svgRect.width;
    const scaleY = HEIGHT / svgRect.height;
    
    const svgX = x * scaleX;
    const svgY = y * scaleY;

    // Don't click out of bounds
    if (svgX < MARGIN.left - 20 || svgX > WIDTH - MARGIN.right + 20) return;
    if (svgY < MARGIN.top - 20 || svgY > HEIGHT - MARGIN.bottom + 20) return;

    const freq = getFreqFromX(svgX);
    const db = getDbFromY(svgY);
    onPointClick(freq, db);
  };

  const renderGrid = () => {
    const lines = [];
    // Y Grid lines (-10 to 120 in steps of 10)
    for (let db = -10; db <= 120; db += 10) {
      const y = getY(db);
      lines.push(
        <line key={`hy_${db}`} x1={MARGIN.left} y1={y} x2={WIDTH - MARGIN.right} y2={y} stroke="#e2e8f0" strokeWidth="1" />
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
        <line key={`vx_${freq}`} x1={x} y1={MARGIN.top} x2={x} y2={HEIGHT - MARGIN.bottom} stroke="#e2e8f0" strokeWidth="1" />
      );
      lines.push(
        <text key={`vx_t_${freq}`} x={x} y={MARGIN.top - 10} textAnchor="middle" fontSize="12" fill="#64748b" style={{ pointerEvents: 'none' }}>
          {freq}
        </text>
      );
    });
    return lines;
  };

  const renderPath = (data: Partial<EarTonalData>, color: string, dasharray: string) => {
    const points = FREQUENCIES
      .filter(f => data[f as keyof EarTonalData]?.va !== undefined && data[f as keyof EarTonalData]?.va !== 'NR')
      .map(f => `${getX(f)},${getY(data[f as keyof EarTonalData]!.va as number)}`)
      .join(' L ');
    
    if (!points) return null;
    return <path d={`M ${points}`} fill="none" stroke={color} strokeWidth="2" strokeDasharray={dasharray} style={{ pointerEvents: 'none' }} />;
  };

  const renderSymbol = (x: number, y: number, type: string, color: string, isNR: boolean, offsetDirection: 1 | -1) => {
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
    }

    return (
      <g key={`${x}-${y}-${type}`} style={{ pointerEvents: 'none' }}>
        {symbol}
        {isNR && (
          <g stroke={color} strokeWidth="2" fill="none">
            <line x1={x + (offsetDirection * 6)} y1={y + 6} x2={x + (offsetDirection * 15)} y2={y + 15} />
            <polyline points={`${x + (offsetDirection * 15)},${y + 10} ${x + (offsetDirection * 15)},${y + 15} ${x + (offsetDirection * 10)},${y + 15}`} />
          </g>
        )}
      </g>
    );
  };

  const renderDataPoints = () => {
    const points: React.ReactNode[] = [];
    FREQUENCIES.forEach(freq => {
      const x = getX(freq);
      
      // OD
      const r = rightData?.[freq as keyof EarTonalData];
      if (r) {
        if (r.va !== undefined) {
          const isNR = r.va === 'NR';
          const y = isNR ? getY(120) : getY(r.va as number);
          points.push(renderSymbol(x, y, r.maskedVa ? 'OD_VA_MASK' : 'OD_VA', '#ef4444', isNR, -1));
        }
        if (r.vo !== undefined) {
          const isNR = r.vo === 'NR';
          const y = isNR ? getY(120) : getY(r.vo as number);
          points.push(renderSymbol(x - 8, y, r.maskedVo ? 'OD_VO_MASK' : 'OD_VO', '#ef4444', isNR, -1));
        }
      }

      // OE
      const l = leftData?.[freq as keyof EarTonalData];
      if (l) {
        if (l.va !== undefined) {
          const isNR = l.va === 'NR';
          const y = isNR ? getY(120) : getY(l.va as number);
          points.push(renderSymbol(x, y, l.maskedVa ? 'OE_VA_MASK' : 'OE_VA', '#3b82f6', isNR, 1));
        }
        if (l.vo !== undefined) {
          const isNR = l.vo === 'NR';
          const y = isNR ? getY(120) : getY(l.vo as number);
          points.push(renderSymbol(x + 8, y, l.maskedVo ? 'OE_VO_MASK' : 'OE_VO', '#3b82f6', isNR, 1));
        }
      }
    });
    return points;
  };

  return (
    <svg 
      id="audiogram-svg" 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`} 
      className={`w-full max-w-full bg-white border rounded-md ${onPointClick ? 'cursor-crosshair' : ''}`}
      onClick={handleSvgClick}
    >
      <text x={WIDTH / 2} y={MARGIN.top - 25} textAnchor="middle" fontSize="14" fontWeight="bold" style={{ pointerEvents: 'none' }}>Frequência (Hz)</text>
      <text x={15} y={HEIGHT / 2} textAnchor="middle" fontSize="14" fontWeight="bold" transform={`rotate(-90, 15, ${HEIGHT/2})`} style={{ pointerEvents: 'none' }}>Intensidade (dB HL)</text>
      
      {/* Grid */}
      {renderGrid()}
      
      {/* Lines connecting VA points */}
      {renderPath(rightData, '#ef4444', '0')}
      {renderPath(leftData, '#3b82f6', '5,5')}
      
      {/* Data points */}
      {renderDataPoints()}
    </svg>
  );
}
