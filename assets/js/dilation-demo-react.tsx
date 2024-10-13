import React, { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

const DilationDemo = () => {
  const svgSize = 500;
  const origin = svgSize / 2;
  const sideLength = 200;
  const height = sideLength * Math.sqrt(3) / 2;
  const gridSize = 50;

  const [scaleFactor, setScaleFactor] = useState(1.50);
  const [centerX, setCenterX] = useState(origin);
  const [centerY, setCenterY] = useState(origin);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [originalPoints, setOriginalPoints] = useState([
    { x: origin, y: origin - height * 2/3 },
    { x: origin - sideLength/2, y: origin + height/3 },
    { x: origin + sideLength/2, y: origin + height/3 },
  ]);
  const [showLabels, setShowLabels] = useState(true);
  const [showSideLengths, setShowSideLengths] = useState(true);

  const dilatedPoints = originalPoints.map(point => ({
    x: centerX + (point.x - centerX) * scaleFactor,
    y: centerY + (point.y - centerY) * scaleFactor,
  }));

  const renderGrid = () => {
    const lines = [];
    for (let i = gridSize; i < svgSize; i += gridSize) {
      lines.push(<line key={`v${i}`} x1={i} y1="0" x2={i} y2={svgSize} stroke="#e0e0e0" strokeWidth="1" />);
      lines.push(<line key={`h${i}`} x1="0" y1={i} x2={svgSize} y2={i} stroke="#e0e0e0" strokeWidth="1" />);
    }
    return lines;
  };

  const renderAxes = () => (
    <>
      <line x1="0" y1={origin} x2={svgSize} y2={origin} stroke="#000" strokeWidth="2" />
      <line x1={origin} y1="0" x2={origin} y2={svgSize} stroke="#000" strokeWidth="2" />
    </>
  );

  const renderTriangle = (points, color) => (
    <polygon
      points={points.map(p => `${p.x},${p.y}`).join(' ')}
      fill="none"
      stroke={color}
      strokeWidth="2"
    />
  );

  const handleMouseDown = useCallback((event, type, index) => {
    event.stopPropagation();
    setIsDragging(true);
    setDraggedItem({ type, index });

    const svg = event.currentTarget.closest('svg');
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (type === 'side') {
      const startPoint = originalPoints[index];
      const endPoint = originalPoints[(index + 1) % 3];
      const midX = (startPoint.x + endPoint.x) / 2;
      const midY = (startPoint.y + endPoint.y) / 2;
      setDragOffset({ x: midX - x, y: midY - y });
    } else if (type === 'corner') {
      const point = originalPoints[index];
      setDragOffset({ x: point.x - x, y: point.y - y });
    } else if (type === 'center') {
      setDragOffset({ x: centerX - x, y: centerY - y });
    }
  }, [originalPoints, centerX, centerY]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const x = e.clientX - rect.left + dragOffset.x;
      const y = e.clientY - rect.top + dragOffset.y;
      
      if (draggedItem.type === 'corner') {
        setOriginalPoints(prevPoints => {
          const newPoints = [...prevPoints];
          newPoints[draggedItem.index] = { x, y };
          return newPoints;
        });
      } else if (draggedItem.type === 'side') {
        setOriginalPoints(prevPoints => {
          const newPoints = [...prevPoints];
          const nextIndex = (draggedItem.index + 1) % 3;
          const dx = x - (prevPoints[draggedItem.index].x + prevPoints[nextIndex].x) / 2;
          const dy = y - (prevPoints[draggedItem.index].y + prevPoints[nextIndex].y) / 2;
          newPoints[draggedItem.index] = { x: prevPoints[draggedItem.index].x + dx, y: prevPoints[draggedItem.index].y + dy };
          newPoints[nextIndex] = { x: prevPoints[nextIndex].x + dx, y: prevPoints[nextIndex].y + dy };
          return newPoints;
        });
      } else if (draggedItem.type === 'center') {
        setCenterX(x);
        setCenterY(y);
      }
    }
  }, [isDragging, draggedItem, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    setScaleFactor(prevScale => {
      const newScale = Math.max(0.1, Math.min(3, prevScale + delta));
      return parseFloat(newScale.toFixed(2));
    });
  }, []);

  const renderLabel = (point, label, color, isOriginal) => {
    const centerOfTriangle = isOriginal
      ? { x: (originalPoints[0].x + originalPoints[1].x + originalPoints[2].x) / 3, y: (originalPoints[0].y + originalPoints[1].y + originalPoints[2].y) / 3 }
      : { x: (dilatedPoints[0].x + dilatedPoints[1].x + dilatedPoints[2].x) / 3, y: (dilatedPoints[0].y + dilatedPoints[1].y + dilatedPoints[2].y) / 3 };
    
    const dx = point.x - centerOfTriangle.x;
    const dy = point.y - centerOfTriangle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const unitDx = dx / distance;
    const unitDy = dy / distance;
    
    const labelOffset = 20;
    const labelX = point.x + unitDx * labelOffset;
    const labelY = point.y + unitDy * labelOffset;

    return (
      <text
        x={labelX}
        y={labelY}
        fill={color}
        fontSize="16"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ userSelect: 'none' }}
      >
        {label}
      </text>
    );
  };

  const renderSideLength = (points, index, color, isOriginal) => {
    const start = points[index];
    const end = points[(index + 1) % 3];
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy) / (gridSize / 5);
    const formattedLength = length.toFixed(2);

    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    const centerOfTriangle = isOriginal
      ? { x: (originalPoints[0].x + originalPoints[1].x + originalPoints[2].x) / 3, y: (originalPoints[0].y + originalPoints[1].y + originalPoints[2].y) / 3 }
      : { x: (dilatedPoints[0].x + dilatedPoints[1].x + dilatedPoints[2].x) / 3, y: (dilatedPoints[0].y + dilatedPoints[1].y + dilatedPoints[2].y) / 3 };

    const toCenterX = centerOfTriangle.x - midX;
    const toCenterY = centerOfTriangle.y - midY;
    const toCenterLength = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
    const unitToCenterX = toCenterX / toCenterLength;
    const unitToCenterY = toCenterY / toCenterLength;

    const labelOffset = 15;
    const labelX = midX - unitToCenterX * labelOffset;
    const labelY = midY - unitToCenterY * labelOffset;

    // Determine if the text needs to be flipped
    const needsFlip = angle > 90 || angle < -90;
    const adjustedAngle = needsFlip ? angle + 180 : angle;

    return (
      <text
        x={labelX}
        y={labelY}
        fill={color}
        fontSize="12"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${adjustedAngle}, ${labelX}, ${labelY})`}
        style={{ userSelect: 'none' }}
      >
        {formattedLength}
      </text>
    );
  };

  return (
    <div className="p-4 mx-auto" style={{ width: `${svgSize}px` }}>
      <h2 className="text-2xl font-bold mb-4">Dilation Demonstration</h2>
      <div className="mb-4">
        <label htmlFor="scale-factor" className="block text-sm font-medium text-gray-700">
          Scale Factor: {scaleFactor.toFixed(2)}
        </label>
        <Slider
          id="scale-factor"
          min={0.1}
          max={3}
          step={0.1}
          value={[scaleFactor]}
          onValueChange={(value) => setScaleFactor(value[0])}
          className="mt-2"
        />
      </div>
      <div className="flex items-center space-x-2 mb-2">
        <Checkbox id="show-labels" checked={showLabels} onCheckedChange={setShowLabels} />
        <label htmlFor="show-labels" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Show Labels
        </label>
      </div>
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox id="show-side-lengths" checked={showSideLengths} onCheckedChange={setShowSideLengths} />
        <label htmlFor="show-side-lengths" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Show Side Lengths
        </label>
      </div>
      <p className="mb-2 text-sm text-gray-600">
        Drag the green dot to move the center point. Drag the blue dots to move corners, or drag the sides directly. Use the mouse wheel to adjust the scale factor.
      </p>
      <svg 
        width={svgSize} 
        height={svgSize} 
        viewBox={`0 0 ${svgSize} ${svgSize}`} 
        className="border border-gray-300"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {renderGrid()}
        {renderAxes()}
        {renderTriangle(originalPoints, "blue")}
        {originalPoints.map((point, index) => (
          <line
            key={`side-${index}`}
            x1={point.x}
            y1={point.y}
            x2={originalPoints[(index + 1) % 3].x}
            y2={originalPoints[(index + 1) % 3].y}
            stroke="transparent"
            strokeWidth="10"
            style={{ cursor: 'move' }}
            onMouseDown={(e) => handleMouseDown(e, 'side', index)}
          />
        ))}
        {renderTriangle(dilatedPoints, "red")}
        {originalPoints.map((point, index) => (
          <circle 
            key={`corner-${index}`}
            cx={point.x} 
            cy={point.y} 
            r="8" 
            fill="transparent"
            cursor="move"
            onMouseDown={(e) => handleMouseDown(e, 'corner', index)}
          />
        ))}
        {originalPoints.map((point, index) => (
          <circle 
            key={`visible-corner-${index}`}
            cx={point.x} 
            cy={point.y} 
            r="4" 
            fill="blue" 
            pointerEvents="none"
          />
        ))}
        <circle 
          cx={centerX} 
          cy={centerY} 
          r="6" 
          fill="green" 
          cursor="move"
          onMouseDown={(e) => handleMouseDown(e, 'center')}
        />
        {showLabels && originalPoints.map((point, index) => renderLabel(point, String.fromCharCode(65 + index), "blue", true))}
        {showLabels && dilatedPoints.map((point, index) => renderLabel(point, String.fromCharCode(65 + index) + "'", "red", false))}
        {showSideLengths && [0, 1, 2].map(index => renderSideLength(originalPoints, index, "blue", true))}
        {showSideLengths && [0, 1, 2].map(index => renderSideLength(dilatedPoints, index, "red", false))}
      </svg>
      <p className="mt-2 text-sm text-gray-600">
        Blue triangle: Original | Red triangle: Dilated | Green dot: Center point | Blue dots: Corners
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Center: ({(centerX - origin).toFixed(0)}, {(origin - centerY).toFixed(0)})
      </p>
    </div>
  );
};

export default DilationDemo;
