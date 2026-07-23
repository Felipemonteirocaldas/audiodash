import React from 'react';

interface TympanometryData {
  peak?: string | number;
  compliance200?: string | number;
  volume?: string | number;
}

interface TympanogramSVGProps {
  rightData?: TympanometryData;
  leftData?: TympanometryData;
  onPointClick?: (pressure: number, compliance: number) => void;
}

export default function TympanogramSVG({ rightData, leftData, onPointClick }: TympanogramSVGProps) {
  const getX = (pressure: number) => ((pressure + 400) / 800) * 360;
  const getY = (compliance: number) => {
    let y = 260;
    if (compliance <= 0.4) y = 260 - (compliance / 0.2) * 26;
    else if (compliance <= 1.0) y = 208 - ((compliance - 0.4) / 0.1) * 26;
    else y = 52 - ((compliance - 1.0) / 0.2) * 26;
    
    // Clamp
    return Math.max(0, Math.min(260, y));
  };

  const getPressureFromX = (x: number): number => {
    // x = ((pressure + 400) / 800) * 360
    // (x / 360) * 800 - 400 = pressure
    const p = (x / 360) * 800 - 400;
    // Snap to nearest 10 daPa
    return Math.max(-400, Math.min(400, Math.round(p / 10) * 10));
  };

  const getComplianceFromY = (y: number): number => {
    let c = 0;
    if (y > 208) c = ((260 - y) / 26) * 0.2; // 0 to 0.4
    else if (y > 52) c = 0.4 + ((208 - y) / 26) * 0.1; // 0.4 to 1.0
    else c = 1.0 + ((52 - y) / 26) * 0.2; // 1.0 to 1.4

    // Snap to nearest 0.1
    return Math.max(0, Math.min(1.4, Math.round(c * 10) / 10));
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onPointClick) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;

    // Scale to viewBox (500x350)
    const scaleX = 500 / svgRect.width;
    const scaleY = 350 / svgRect.height;
    
    const svgX = x * scaleX;
    const svgY = y * scaleY;

    // Remove translate offset (50, 40)
    const gridX = svgX - 50;
    const gridY = svgY - 40;

    // Bounds check
    if (gridX < -20 || gridX > 380) return;
    if (gridY < -20 || gridY > 280) return;

    const pressure = getPressureFromX(gridX);
    const compliance = getComplianceFromY(gridY);
    onPointClick(pressure, compliance);
  };

  const renderPeak = (data: TympanometryData | undefined, color: string, isRight: boolean) => {
    if (!data) return null;
    
    // Convert comma to dot for Brazilian inputs
    const pStr = String(data.peak || '0').replace(',', '.');
    const cStr = String(data.compliance200 || '0').replace(',', '.');
    
    const pressure = parseFloat(pStr);
    const compliance = parseFloat(cStr);
    
    if (isNaN(pressure) || isNaN(compliance) || (data.peak === undefined && data.compliance200 === undefined)) return null;

    const x = getX(pressure);
    const y = getY(compliance);

    // Realistic Bell Curve for Tympanogram
    const startX = getX(-400); // Start curve at -400 daPa
    const endX = getX(200);   // End curve at +200 daPa
    const baseY = getY(0);    // Base compliance 0

    return (
      <g style={{ pointerEvents: 'none' }}>
        <path 
          d={`M ${startX} ${baseY} C ${(startX + x) / 2} ${baseY}, ${(startX + x) / 2} ${y}, ${x} ${y} C ${(x + endX) / 2} ${y}, ${(x + endX) / 2} ${baseY}, ${endX} ${baseY}`} 
          stroke={color} 
          strokeWidth="2" 
          fill="none" 
          opacity="0.8" 
          strokeDasharray={isRight ? "" : "5,5"} 
        />
        {isRight ? (
          <circle cx={x} cy={y} r="4" fill="none" stroke={color} strokeWidth="2" />
        ) : (
          <path d={`M ${x-4} ${y-4} L ${x+4} ${y+4} M ${x+4} ${y-4} L ${x-4} ${y+4}`} stroke={color} strokeWidth="2" fill="none" />
        )}
      </g>
    );
  };

  return (
    <svg 
      viewBox="0 0 500 350" 
      className={`w-full max-w-[400px] ${onPointClick ? 'cursor-crosshair' : ''}`} 
      style={{ backgroundColor: 'white' }}
      onClick={handleSvgClick}
    >
      {/* Title */}
      <text x="230" y="20" textAnchor="middle" fontSize="14" fontWeight="bold" style={{ pointerEvents: 'none' }}>Timpanograma</text>

      {/* Grid Area */}
      <g transform="translate(50, 40)">
        {/* Background Grid */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
          const y = (260 / 10) * i;
          return <line key={`h-${i}`} x1="0" y1={y} x2="360" y2={y} stroke="#e5e7eb" strokeWidth="1" />;
        })}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
          const x = (360 / 8) * i;
          return <line key={`v-${i}`} x1={x} y1="0" x2={x} y2="260" stroke="#e5e7eb" strokeWidth="1" />;
        })}

        {/* Axes */}
        <line x1="0" y1="260" x2="360" y2="260" stroke="black" strokeWidth="1.5" />
        <line x1="0" y1="0" x2="0" y2="260" stroke="black" strokeWidth="1.5" />
        <line x1="360" y1="0" x2="360" y2="260" stroke="black" strokeWidth="1.5" />
        <line x1="0" y1="0" x2="360" y2="0" stroke="black" strokeWidth="1.5" />

        {/* X-axis labels (Pressure: -400 to +400) */}
        {['-400', '-300', '-200', '-100', '0', '+100', '+200', '+300', '+400'].map((val, i) => (
          <text key={`x-${i}`} x={(360 / 8) * i} y="275" textAnchor="middle" fontSize="10" style={{ pointerEvents: 'none' }}>{val}</text>
        ))}

        {/* Y-axis labels (Compliance: 0.2 to 1.4) */}
        {['1.4', '1.2', '1.0', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.2', ''].map((val, i) => (
          val && <text key={`y-${i}`} x="-10" y={(260 / 10) * i + 4} textAnchor="end" fontSize="10" style={{ pointerEvents: 'none' }}>{val}</text>
        ))}

        {/* Right Label (COMPLACÊNCIA) */}
        <text transform="translate(375, 130) rotate(90)" textAnchor="middle" fontSize="10" letterSpacing="4" style={{ pointerEvents: 'none' }}>COMPLACÊNCIA</text>

        {/* Plotted Peaks and Curves */}
        {renderPeak(rightData, 'red', true)}
        {renderPeak(leftData, 'blue', false)}
      </g>
    </svg>
  );
}
