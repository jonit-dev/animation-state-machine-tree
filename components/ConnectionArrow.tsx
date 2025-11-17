import React, { useMemo } from 'react';
import type { Node, Condition, Point } from '../types';

interface ConnectionArrowProps {
  fromNode: Node;
  toNode: Node;
  isSelected: boolean;
  isActiveTransition: boolean;
  hasReverseConnection: boolean;
  onClick: () => void;
  conditions: Condition[];
}

const getAttachmentPoints = (node: Node, isSource: boolean): Point[] => {
    if (isSource && (node.id === 'entry' || node.id === 'any-state')) {
        return [{ x: node.position.x + node.width, y: node.position.y + node.height / 2 }]; // Right side only
    }

    return [
        { x: node.position.x + node.width / 2, y: node.position.y }, // Top
        { x: node.position.x + node.width, y: node.position.y + node.height / 2 }, // Right
        { x: node.position.x + node.width / 2, y: node.position.y + node.height }, // Bottom
        { x: node.position.x, y: node.position.y + node.height / 2 }, // Left
    ];
};

const distanceSq = (p1: Point, p2: Point) => {
    return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
};

export const ConnectionArrow: React.FC<ConnectionArrowProps> = ({ fromNode, toNode, isSelected, isActiveTransition, hasReverseConnection, onClick, conditions }) => {
  const { pathData, labelPosition } = useMemo(() => {
    const fromPoints = getAttachmentPoints(fromNode, true);
    const toPoints = getAttachmentPoints(toNode, false);
    
    let bestPoints = { from: fromPoints[0], to: toPoints[0], dist: Infinity };

    for (const from of fromPoints) {
        for (const to of toPoints) {
            const dist = distanceSq(from, to);
            if(dist < bestPoints.dist) {
                bestPoints = { from, to, dist };
            }
        }
    }

    const { from: start, to: end } = bestPoints;

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const nx = -dy / (dist || 1);
    const ny = dx / (dist || 1);
    
    let curveIntensity = Math.min(dist * 0.3, 60);

    // If there's a reverse connection, offset the curve
    if (hasReverseConnection) {
        curveIntensity = Math.max(20, curveIntensity);
    } else {
        // If nodes are overlapping, push control point out more
        if (
            fromNode.position.x < toNode.position.x + toNode.width &&
            fromNode.position.x + fromNode.width > toNode.position.x &&
            fromNode.position.y < toNode.position.y + toNode.height &&
            fromNode.position.y + fromNode.height > toNode.position.y
        ) {
            curveIntensity = 100;
        }
    }


    const controlX = midX + nx * curveIntensity;
    const controlY = midY + ny * curveIntensity;

    const path = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
    
    const labelX = 0.25 * start.x + 0.5 * controlX + 0.25 * end.x;
    const labelY = 0.25 * start.y + 0.5 * controlY + 0.25 * end.y;

    return { pathData: path, labelPosition: { x: labelX, y: labelY } };
  }, [fromNode, toNode, hasReverseConnection]);

  const strokeColor = isActiveTransition ? '#f59e0b' : isSelected ? '#2dd4bf' : '#94a3b8';
  const strokeWidth = isActiveTransition ? 3 : 2;

  const conditionLabel = useMemo(() => {
      if (conditions.length === 0) return null;
      if (conditions.length === 1) {
          const c = conditions[0];
          return `${c.parameter} ${c.operator} ${c.value}`;
      }
      return "Multiple Conditions";
  }, [conditions]);

  return (
    <g className="cursor-pointer group" onClick={onClick} style={{ pointerEvents: 'auto' }}>
      <defs>
        <marker
          id={`arrowhead-${strokeColor.replace('#', '')}`}
          markerWidth="10"
          markerHeight="7"
          refX="8"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} className="transition-colors duration-300"/>
        </marker>
      </defs>
      
      {/* Invisible wider path for easier clicking */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="20"
        fill="none"
        style={{ pointerEvents: 'stroke' }}
      />
      
      {/* Glow effect for active transition */}
      {isActiveTransition && (
        <path
            d={pathData}
            stroke="#f59e0b"
            strokeWidth="10"
            fill="none"
            className="opacity-30 transition-opacity duration-300"
            style={{ pointerEvents: 'none' }}
        />
      )}
       
       <path
        d={pathData}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        markerEnd={`url(#arrowhead-${strokeColor.replace('#', '')})`}
        className="transition-colors duration-300 group-hover:stroke-teal-400"
        style={{ pointerEvents: 'none' }}
      />

      {conditionLabel && (
          <text 
            x={labelPosition.x} y={labelPosition.y} 
            dy="-5" 
            textAnchor="middle" 
            className="text-xs fill-slate-200 font-semibold" 
            style={{
                pointerEvents: 'none',
                paintOrder: "stroke",
                stroke: "#334155", // slate-700
                strokeWidth: "4px",
                strokeLinecap: "butt",
                strokeLinejoin: "miter"
            }}
          >
              {conditionLabel}
          </text>
      )}
    </g>
  );
};