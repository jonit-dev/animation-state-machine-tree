import React, { useCallback } from 'react';
import type { Node, Point } from '../types';

interface StateNodeProps {
  node: Node;
  isActive: boolean;
  isConnecting: boolean;
  onStartDrag: (id: string, e: React.PointerEvent<HTMLDivElement>) => void;
  onStartConnection: (id: string, point: Point) => void;
  onEndConnection: (id?: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
}

const ConnectionHandle: React.FC<{
  onMouseDown: (e: React.MouseEvent) => void;
  position: { top?: string; left?: string; right?: string; bottom?: string; transform?: string };
}> = ({ onMouseDown, position }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    ...position,
  };
  return (
    <div
      className="absolute h-5 w-5 flex items-center justify-center connection-handle-wrapper"
      style={style}
      onMouseDown={onMouseDown}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="h-2 w-2 bg-teal-400 rounded-full cursor-pointer group-hover:h-3 group-hover:w-3 group-hover:bg-teal-300 transition-all z-10" />
    </div>
  );
};


export const StaticStateNode: React.FC<{
  node: Omit<Node, 'isDefault'>;
  onStartConnection: (id: string, point: Point) => void;
}> = ({ node, onStartConnection }) => {
    const nodeRef = React.useRef<HTMLDivElement>(null);
    const createConnectionHandler = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (nodeRef.current) {
          const parentRect = nodeRef.current.parentElement!.getBoundingClientRect();
          const rect = nodeRef.current.getBoundingClientRect();
          const x = rect.right - parentRect.left;
          const y = rect.top - parentRect.top + rect.height / 2;
          onStartConnection(node.id, { x, y });
        }
    }, [node.id, onStartConnection]);

    const nodeClasses = `group absolute flex items-center justify-center rounded-lg shadow-md border-2 
        ${node.id === 'entry' ? 'bg-green-800 border-green-600' : 'bg-indigo-800 border-indigo-600'}`;

    return (
        <div
            ref={nodeRef}
            className={nodeClasses}
            style={{ left: node.position.x, top: node.position.y, width: node.width, height: node.height }}
        >
            <span className="font-bold text-sm truncate select-none text-slate-100">{node.name}</span>
            {node.id !== 'entry' && (
                <ConnectionHandle onMouseDown={createConnectionHandler} position={{ top: '50%', right: '0', transform: 'translate(50%, -50%)' }} />
            )}
        </div>
    );
};

export const StateNode: React.FC<StateNodeProps> = ({
  node,
  isActive,
  isConnecting,
  onStartDrag,
  onStartConnection,
  onEndConnection,
  onContextMenu,
}) => {
  const nodeRef = React.useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.connection-handle-wrapper')) return;
    
    e.stopPropagation();
    onStartDrag(node.id, e);
  }, [node.id, onStartDrag]);

  const handlePointerUp = useCallback(() => {
    onEndConnection(node.id);
  }, [node.id, onEndConnection]);

  const createConnectionHandler = (side: 'top' | 'right' | 'bottom' | 'left') => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeRef.current) {
      const parentRect = nodeRef.current.parentElement!.getBoundingClientRect();
      const rect = nodeRef.current.getBoundingClientRect();
      let x = 0, y = 0;
      switch (side) {
        case 'top':
          x = rect.left - parentRect.left + rect.width / 2;
          y = rect.top - parentRect.top;
          break;
        case 'right':
          x = rect.right - parentRect.left;
          y = rect.top - parentRect.top + rect.height / 2;
          break;
        case 'bottom':
          x = rect.left - parentRect.left + rect.width / 2;
          y = rect.bottom - parentRect.top;
          break;
        case 'left':
          x = rect.left - parentRect.left;
          y = rect.top - parentRect.top + rect.height / 2;
          break;
      }
      onStartConnection(node.id, { x, y });
    }
  };

  const nodeClasses = `group absolute flex flex-col rounded-lg shadow-lg cursor-grab transition-all duration-150 border-2 bg-slate-700 
    ${isActive ? 'border-teal-400 shadow-teal-500/20' : node.isDefault ? 'border-orange-500' : 'border-slate-600 hover:border-slate-500'}
  `;

  return (
    <div
      ref={nodeRef}
      className={nodeClasses}
      style={{ left: node.position.x, top: node.position.y, width: node.width, height: node.height }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => {
        if (isConnecting) {
          (nodeRef.current as HTMLDivElement).classList.add('border-green-500');
        }
      }}
      onMouseLeave={() => {
        (nodeRef.current as HTMLDivElement).classList.remove('border-green-500');
      }}
      onContextMenu={(e) => onContextMenu(e, node.id)}
      title={node.isDefault ? `${node.name} (Default State)` : node.name}
    >
      <div className="flex-grow px-3 py-2 flex items-center">
        <span className="font-bold text-sm truncate select-none text-slate-100">{node.name}</span>
      </div>
      <div className="h-1.5 bg-slate-600/50 rounded-b-md overflow-hidden mx-[1px] mb-[1px]">
        <div
          className="h-full bg-teal-500"
          style={{
            width: '100%',
            animation: isActive ? 'progress-bar 2s ease-in-out infinite' : 'none',
          }}
        ></div>
        <style>{`
          @keyframes progress-bar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
      
      <div>
        <ConnectionHandle onMouseDown={createConnectionHandler('top')} position={{ top: '0', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <ConnectionHandle onMouseDown={createConnectionHandler('right')} position={{ top: '50%', right: '0', transform: 'translate(50%, -50%)' }} />
        <ConnectionHandle onMouseDown={createConnectionHandler('bottom')} position={{ bottom: '0', left: '50%', transform: 'translate(-50%, 50%)' }} />
        <ConnectionHandle onMouseDown={createConnectionHandler('left')} position={{ top: '50%', left: '0', transform: 'translate(-50%, -50%)' }} />
      </div>
    </div>
  );
};