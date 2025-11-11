import React from 'react';
import Svg, { Path, Polygon, Line, Text as SvgText, TSpan } from 'react-native-svg';

interface AltranoLogoProps {
  width?: number;
  height?: number;
  showText?: boolean;
}

export const AltranoLogo: React.FC<AltranoLogoProps> = ({ 
  width = 200, 
  height = 200,
  showText = false 
}) => {
  // Logo dimensions
  const viewBoxSize = 200;
  const iconViewBoxSize = 100;
  
  // Hexagon positions (normal hexagon, wider than tall, horizontal top/bottom)
  const centerX = iconViewBoxSize * 0.5;
  const topY = iconViewBoxSize * 0.1;
  const bottomY = iconViewBoxSize * 0.9;
  const leftX = iconViewBoxSize * 0.15;
  const rightX = iconViewBoxSize * 0.85;
  const topLeftX = iconViewBoxSize * 0.15;
  const topRightX = iconViewBoxSize * 0.85;
  const bottomLeftX = iconViewBoxSize * 0.15;
  const bottomRightX = iconViewBoxSize * 0.85;
  
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${viewBoxSize} ${showText ? 250 : iconViewBoxSize}`}>
      {/* Normal hexagon outline (wider than tall, horizontal top/bottom) */}
      <Polygon
        points={`${centerX},${topY} ${topRightX},${iconViewBoxSize * 0.25} ${bottomRightX},${iconViewBoxSize * 0.75} ${centerX},${bottomY} ${bottomLeftX},${iconViewBoxSize * 0.75} ${topLeftX},${iconViewBoxSize * 0.25}`}
        fill="none"
        stroke="#007AFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Building/house shape inside hexagon - starts bottom-left, goes up, right, up (chimney), right, down, right, down to bottom-right */}
      <Path
        d={`M ${bottomLeftX} ${iconViewBoxSize * 0.75} 
            L ${bottomLeftX} ${iconViewBoxSize * 0.5} 
            L ${iconViewBoxSize * 0.35} ${iconViewBoxSize * 0.5} 
            L ${iconViewBoxSize * 0.35} ${iconViewBoxSize * 0.25} 
            L ${iconViewBoxSize * 0.5} ${iconViewBoxSize * 0.25} 
            L ${iconViewBoxSize * 0.5} ${iconViewBoxSize * 0.5} 
            L ${bottomRightX} ${iconViewBoxSize * 0.5} 
            L ${bottomRightX} ${iconViewBoxSize * 0.75}`}
        fill="none"
        stroke="#007AFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Vertical line in center - from bottom edge up, but not reaching top */}
      <Line
        x1={centerX}
        y1={iconViewBoxSize * 0.75}
        x2={centerX}
        y2={iconViewBoxSize * 0.3}
        stroke="#007AFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {showText && (
        <>
          {/* ALTRANO.CZ text - ALTRANO large, .CZ smaller */}
          <SvgText
            x={viewBoxSize * 0.5}
            y={iconViewBoxSize + 35}
            fontSize="32"
            fontWeight="bold"
            fill="#007AFF"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            <TSpan fontSize="32">ALTRANO</TSpan>
            <TSpan fontSize="24">.CZ</TSpan>
          </SvgText>
          
          {/* Tagline - smaller, italic */}
          <SvgText
            x={viewBoxSize * 0.5}
            y={iconViewBoxSize + 55}
            fontSize="14"
            fill="#007AFF"
            textAnchor="middle"
            fontFamily="sans-serif"
            fontStyle="italic"
          >
            platforma pro moderní bydlení
          </SvgText>
        </>
      )}
    </Svg>
  );
};

