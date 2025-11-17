import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { AnimationClip } from 'three';
import { StateNode, StaticStateNode } from './StateNode';
import { ConnectionArrow } from './ConnectionArrow';
import { ConditionsPanel } from './ConditionsPanel';
import { ParametersPanel } from './ParametersPanel';
import { ContextMenu } from './ContextMenu';
import type { Node, Connection, Point, Parameter, Condition } from '../types';
import { BooleanOperator } from '../types';

interface AnimationStateEditorProps {
  animations: AnimationClip[];
  onPreview: (name: string | null) => void;
  activePreviewName: string | null;
  onSetActiveState: (name: string | null, duration: number) => void;
  activeStateName: string | null;
  parameters: Parameter[];
  setParameters: React.Dispatch<React.SetStateAction<Parameter[]>>;
  parameterValues: Record<string, number | boolean>;
}

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
    </svg>
);

const staticNodes: Record<string, Node> = {
    'entry': { id: 'entry', name: 'Entry', position: { x: 50, y: 150 }, width: 120, height: 40 },
    'any-state': { id: 'any-state', name: 'Any State', position: { x: 50, y: 250 }, width: 120, height: 40 },
};

export default function AnimationStateEditor({ animations, onPreview, activePreviewName, onSetActiveState, activeStateName, parameters, setParameters, parameterValues }: AnimationStateEditorProps) {
  const [nodes, setNodes] = useState<Map<string, Node>>(new Map());
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeStateId, setActiveStateId] = useState<string | null>(null);
  const [stateEntryTime, setStateEntryTime] = useState<number>(0);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [connecting, setConnecting] = useState<{ from: string; fromPoint: Point; toPoint: Point } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, nodeId: string } | null>(null);
  const [activeTransitionId, setActiveTransitionId] = useState<string | null>(null);
  
  const [draggingNode, setDraggingNode] = useState<{ id: string, offset: Point } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const idleAnim = animations.find(a => a.name === 'Idle');
    if (idleAnim && nodes.size === 0) {
      const id = `node-${Date.now()}`;
      const newNode = {
        id,
        name: idleAnim.name,
        position: { x: 250, y: 150 },
        width: 180,
        height: 52,
        isDefault: true,
      };
      setNodes(new Map([[id, newNode]]));
      setActiveStateId(id);
      onSetActiveState(idleAnim.name, 0.5);
      setStateEntryTime(Date.now());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animations]);
  
  useEffect(() => {
    const activeNode = [...nodes.values()].find(n => n.name === activeStateName);
    if (activeNode && activeNode.id !== activeStateId) {
        setActiveStateId(activeNode.id);
        setStateEntryTime(Date.now());
    } else if (activeStateName === null && activeStateId !== null) {
        setActiveStateId(null);
    }
  }, [activeStateName, nodes, activeStateId]);

  useEffect(() => {
    if (!activeStateId && ![...nodes.values()].some(n => n.isDefault)) return;
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const checkTransitions = () => {
        const fromIds = ['any-state', activeStateId].filter(Boolean) as string[];

        for (const fromId of fromIds) {
            const outgoingConnections = connections.filter(c => c.from === fromId);

            for (const connection of outgoingConnections) {
                if (connection.to === activeStateId) continue;
                
                const currentAnimation = animations.find(anim => anim.name === activeStateName);
                if (connection.hasExitTime && currentAnimation && fromId !== 'any-state') {
                    if (Date.now() - stateEntryTime < currentAnimation.duration * 1000) {
                        continue; // Not finished yet
                    }
                }

                const allConditionsMet = connection.conditions.length === 0 || connection.conditions.every(cond => {
                    const param = parameters.find(p => p.name === cond.parameter);
                    if (!param) return false;

                    const paramValue = parameterValues[cond.parameter];
                    
                    if (param.type === 'float') {
                        if (typeof paramValue !== 'number') return false;
                        switch (cond.operator) {
                            case '>': return paramValue > cond.value;
                            case '<': return paramValue < cond.value;
                            case '==': return paramValue == cond.value;
                            case '!=': return paramValue != cond.value;
                            default: return false;
                        }
                    } else if (param.type === 'boolean' || param.type === 'trigger') {
                        if (typeof paramValue !== 'boolean') return false;
                        switch (cond.operator) {
                            case BooleanOperator.IS_TRUE: return paramValue === true;
                            case BooleanOperator.IS_FALSE: return paramValue === false;
                            default: return false;
                        }
                    }
                    return false;
                });

                if (allConditionsMet) {
                    const nextNode = nodes.get(connection.to);
                    if (nextNode) {
                        const triggersToReset = connection.conditions
                            .map(cond => parameters.find(p => p.name === cond.parameter))
                            .filter((p): p is Parameter => !!p && p.type === 'trigger' && p.value === true)
                            .map(p => p.id);
                        
                        if (triggersToReset.length > 0) {
                            setParameters(prevParams => prevParams.map(p => 
                                (triggersToReset.includes(p.id) && p.type === 'trigger') ? { ...p, value: false } : p
                            ));
                        }

                        onSetActiveState(nextNode.name, connection.duration);
                        setActiveTransitionId(connection.id);
                        timeoutId = setTimeout(() => setActiveTransitionId(null), 1000);
                        return; // Exit after the first valid transition is found
                    }
                }
            }
        }
    };

    const intervalId = setInterval(checkTransitions, 100);

    return () => {
        clearInterval(intervalId);
        if(timeoutId) clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameterValues, activeStateId, connections, nodes, animations, stateEntryTime]);

  const addNode = (name: string) => {
    const alreadyExists = [...nodes.values()].some(node => node.name === name);
    if (alreadyExists) return;

    const id = `node-${Date.now()}`;
    const newNode: Node = {
      id,
      name,
      position: { x: 250, y: 50 + nodes.size * 80 },
      width: 180,
      height: 52,
      isDefault: nodes.size === 0,
    };
    setNodes(prev => new Map(prev).set(id, newNode));
    if (newNode.isDefault) {
        onSetActiveState(name, 0.5);
    }
  };

  const deleteNode = useCallback((id: string) => {
    console.log(`[deleteNode] Attempting to delete node with ID: ${id}`);
    const nodeToDelete = nodes.get(id);

    if (!nodeToDelete) {
        console.error(`[deleteNode] FAILED: Node with ID ${id} not found in the current state.`);
        setContextMenu(null);
        return;
    }

    console.log(`[deleteNode] State before deletion:`, {
        nodeToDelete,
        activeStateId,
        activeStateName,
        isDefault: nodeToDelete.isDefault,
        totalNodes: nodes.size,
    });
    
    // Perform all calculations before setting state
    const nextNodes = new Map(nodes);
    nextNodes.delete(id);

    const nextConnections = connections.filter(c => c.from !== id && c.to !== id);
    
    let nextActiveStateName: string | null = activeStateName;

    // Case 1: The deleted node IS the currently active state
    if (activeStateId === id) {
        console.log('[deleteNode] LOGIC: Deleting the currently ACTIVE state.');
        // Subcase 1a: The deleted node was also the default. We MUST find a new default.
        if (nodeToDelete.isDefault) {
            console.log('[deleteNode] LOGIC: Deleting the active AND default state. A new default must be assigned.');
            if (nextNodes.size > 0) {
                const newDefaultNode = [...nextNodes.values()][0];
                nextNodes.set(newDefaultNode.id, { ...newDefaultNode, isDefault: true });
                nextActiveStateName = newDefaultNode.name;
                console.log(`[deleteNode] New default and active state will be: "${newDefaultNode.name}" (ID: ${newDefaultNode.id})`);
            } else {
                nextActiveStateName = null;
                console.log('[deleteNode] No nodes left. Active state will be null.');
            }
        } 
        // Subcase 1b: The deleted node was active, but NOT default. Fall back to the default state.
        else {
            console.log('[deleteNode] LOGIC: Deleting active (but not default) state. Falling back to default.');
            const defaultNode = [...nextNodes.values()].find(n => n.isDefault);
            nextActiveStateName = defaultNode ? defaultNode.name : null;
            console.log(`[deleteNode] Fallback active state will be: "${nextActiveStateName}"`);
        }
    } 
    // Case 2: The deleted node is NOT active, but it IS the default.
    // The active state can remain, but we need a new default state.
    else if (nodeToDelete.isDefault) {
        console.log('[deleteNode] LOGIC: Deleting default (but not active) state.');
         if (nextNodes.size > 0 && ![...nextNodes.values()].some(n => n.isDefault)) {
             const newDefaultNode = [...nextNodes.values()][0];
             nextNodes.set(newDefaultNode.id, { ...newDefaultNode, isDefault: true });
             console.log(`[deleteNode] New default state will be: "${newDefaultNode.name}". Active state remains "${activeStateName}".`);
         }
    } else {
        console.log('[deleteNode] LOGIC: Deleting a non-active, non-default node. No change to active/default state needed.');
    }

    console.log('[deleteNode] Applying state updates...', {
        nextNodesSize: nextNodes.size,
        nextConnectionsSize: nextConnections.length,
        nextActiveStateName,
        activeStateNameChanged: nextActiveStateName !== activeStateName,
    });

    // Now, batch all state updates
    setNodes(nextNodes);
    setConnections(nextConnections);
    
    if (nextActiveStateName !== activeStateName) {
        onSetActiveState(nextActiveStateName, 0.5);
    }
    setContextMenu(null);

}, [nodes, connections, activeStateId, activeStateName, onSetActiveState]);

  
  const setDefaultState = useCallback((id: string) => {
    setNodes(prev => {
        const newNodes = new Map(prev);
        let newDefaultNodeName: string | null = null;
        for (const node of newNodes.values()) {
            const isNowDefault = node.id === id;
            if (node.isDefault !== isNowDefault) {
                newNodes.set(node.id, { ...node, isDefault: isNowDefault });
            }
            if (isNowDefault) {
                newDefaultNodeName = node.name;
            }
        }
        
        if (newDefaultNodeName && activeStateName === null) {
            onSetActiveState(newDefaultNodeName, 0.5);
        }
        return newNodes;
    });
    setContextMenu(null);
  }, [onSetActiveState, activeStateName]);


  const handleStartConnection = useCallback((from: string, fromPoint: Point) => {
    setConnecting({ from, fromPoint, toPoint: fromPoint });
    setContextMenu(null);
  }, []);
  
  const handleEndConnection = useCallback((targetNodeId?: string) => {
    if (connecting && targetNodeId && connecting.from !== targetNodeId) {
        // Cannot connect to 'entry'
        if (targetNodeId === 'entry') {
            setConnecting(null);
            return;
        }

      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        from: connecting.from,
        to: targetNodeId,
        conditions: [],
        duration: 0.5,
        hasExitTime: false,
      };
      setConnections(prev => [...prev, newConnection]);
    }
    setConnecting(null);
  }, [connecting]);

  const handlePointerDownCanvas = useCallback((e: React.PointerEvent) => {
    // Only clear selections/menus if the click is directly on the background
    if (e.target === canvasRef.current || (e.target as HTMLElement).closest('.canvas-background')) {
        if (contextMenu) {
            setContextMenu(null);
        }
        setSelectedConnection(null);
    }
  }, [contextMenu]);
  
  const handleStartDrag = useCallback((id: string, e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const node = nodes.get(id);
    if (!node) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setDraggingNode({
      id,
      offset: {
        x: mouseX - node.position.x,
        y: mouseY - node.position.y,
      },
    });
  }, [nodes]);

  useEffect(() => {
    if (!draggingNode) return;
    
    document.body.style.cursor = 'grabbing';
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    let animationFrameId: number | null = null;
    let latestEvent: PointerEvent | null = null;

    const updatePosition = () => {
        if (!latestEvent || !draggingNode) {
            animationFrameId = null;
            return;
        }

        const newPosition = {
            x: latestEvent.clientX - canvasRect.left - draggingNode.offset.x,
            y: latestEvent.clientY - canvasRect.top - draggingNode.offset.y,
        };
        
        setNodes(prev => {
            const newNodes = new Map(prev);
            const node = newNodes.get(draggingNode.id);
            if (node) {
                newNodes.set(draggingNode.id, { ...node, position: newPosition });
            }
            return newNodes;
        });

        animationFrameId = null; 
    };

    const handleMove = (e: PointerEvent) => {
        latestEvent = e;
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(updatePosition);
        }
    };

    const handleUp = () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        setDraggingNode(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        document.body.style.cursor = '';
    };
  }, [draggingNode, setNodes]);

  const handlePointerMoveCanvas = useCallback((e: React.PointerEvent) => {
    if (connecting && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setConnecting(prev => prev ? { ...prev, toPoint: { x: e.clientX - rect.left, y: e.clientY - rect.top } } : null);
    }
  }, [connecting]);
  
  const updateConnection = (updatedConnection: Connection) => {
    setConnections(prev => prev.map(c => c.id === updatedConnection.id ? updatedConnection : c));
    setSelectedConnection(updatedConnection);
  };
  
  const deleteConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
    setSelectedConnection(null);
  };
  
  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setContextMenu({ 
            x: e.clientX - rect.left, 
            y: e.clientY - rect.top, 
            nodeId 
        });
      }
  }, []);
  
  const handleUpdateParameterValue = (id: string, value: number | boolean) => {
    setParameters(prev => prev.map(p => p.id === id ? {...p, value: value as any} : p));
  };

  const connectionSet = React.useMemo(() => {
    const set = new Set<string>();
    connections.forEach(c => set.add(`${c.from}->${c.to}`));
    return set;
  }, [connections]);

  return (
    <div className="flex h-full">
      <div className="w-80 bg-slate-900 p-4 flex flex-col border-r border-slate-700">
        <h1 className="text-xl font-bold mb-4 px-2 text-slate-100">Animation Controller</h1>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-6">
           <div>
              <h2 className="text-lg font-bold px-2 mb-2 text-slate-300">Animations</h2>
              {animations.map(anim => {
                  const isPreviewing = activePreviewName === anim.name;
                  const nodeExists = [...nodes.values()].some(node => node.name === anim.name);
                  const handlePreviewClick = () => {
                      onPreview(isPreviewing ? null : anim.name);
                  };

                  return (
                    <div key={anim.name} className="bg-slate-800 p-3 rounded-lg mb-2 border border-slate-700">
                      <p className="font-semibold text-sm truncate text-slate-200">{anim.name}</p>
                      <div className="flex mt-2 space-x-2">
                          <button
                            onClick={handlePreviewClick}
                            className={`flex items-center text-xs px-2 py-1.5 rounded-md w-full justify-center transition-colors font-semibold ${
                                isPreviewing
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-teal-600 hover:bg-teal-500 text-white'
                            }`}
                          >
                              {isPreviewing ? <StopIcon /> : <PlayIcon />}
                              {isPreviewing ? 'Stop Preview' : 'Preview'}
                          </button>
                          <button
                            onClick={() => addNode(anim.name)}
                            disabled={nodeExists}
                            className="flex items-center text-xs bg-slate-600 hover:bg-slate-500 text-slate-100 px-2 py-1.5 rounded-md w-full justify-center transition-colors font-semibold disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                          >
                              <PlusIcon /> Add State
                          </button>
                      </div>
                    </div>
                  );
              })}
           </div>

           <ParametersPanel 
            parameters={parameters} 
            setParameters={setParameters}
            onUpdateValue={handleUpdateParameterValue}
           />
        </div>
      </div>
      <div 
        className="flex-grow h-full bg-slate-800 relative overflow-hidden select-none"
        ref={canvasRef}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMoveCanvas}
      >
        <div 
            className="absolute inset-0 canvas-background"
            style={{
                backgroundImage: `
                    linear-gradient(rgba(100, 116, 139, 0.2) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(100, 116, 139, 0.2) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
            }}
        ></div>
        
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {connections.map(conn => {
            const fromNode = nodes.get(conn.from) || staticNodes[conn.from];
            const toNode = nodes.get(conn.to);
            if (!fromNode || !toNode) return null;
            const hasReverse = connectionSet.has(`${conn.to}->${conn.from}`);
            return (
              <ConnectionArrow
                key={conn.id}
                fromNode={fromNode}
                toNode={toNode}
                isSelected={selectedConnection?.id === conn.id}
                isActiveTransition={activeTransitionId === conn.id}
                hasReverseConnection={hasReverse}
                onClick={() => setSelectedConnection(conn)}
                conditions={conn.conditions}
              />
            );
          })}
          {connecting && <line x1={connecting.fromPoint.x} y1={connecting.fromPoint.y} x2={connecting.toPoint.x} y2={connecting.toPoint.y} stroke="#2dd4bf" strokeWidth="2" />}
        </svg>

        {Object.values(staticNodes).map(node => (
            <StaticStateNode key={node.id} node={node} onStartConnection={handleStartConnection} />
        ))}

        {[...nodes.values()].map(node => (
          <StateNode
            key={node.id}
            node={node}
            isActive={activeStateId === node.id}
            isConnecting={!!connecting}
            onStartDrag={handleStartDrag}
            onStartConnection={handleStartConnection}
            onEndConnection={handleEndConnection}
            onContextMenu={handleNodeContextMenu}
          />
        ))}
        {contextMenu && (
            <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
                <button
                    onClick={() => setDefaultState(contextMenu.nodeId)}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                >
                    Set as Default State
                </button>
                <button
                    onClick={() => deleteNode(contextMenu.nodeId)}
                    className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                >
                    Delete State
                </button>
            </ContextMenu>
        )}
      </div>
      {selectedConnection && (
        <ConditionsPanel 
          connection={selectedConnection} 
          parameters={parameters}
          onClose={() => setSelectedConnection(null)} 
          onUpdate={updateConnection}
          onDelete={deleteConnection}
        />
      )}
    </div>
  );
}