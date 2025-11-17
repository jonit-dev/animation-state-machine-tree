import React, { useState } from 'react';
import type { Parameter } from '../types';

interface ParametersPanelProps {
    parameters: Parameter[];
    setParameters: React.Dispatch<React.SetStateAction<Parameter[]>>;
    onUpdateValue: (id: string, value: number | boolean) => void;
}

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export const ParametersPanel: React.FC<ParametersPanelProps> = ({ parameters, setParameters, onUpdateValue }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const addParameter = (type: 'float' | 'boolean' | 'trigger') => {
        const existingNames = new Set(parameters.map(p => p.name));
        let newName = `new${type.charAt(0).toUpperCase() + type.slice(1)}`;
        let counter = 0;
        while (existingNames.has(newName)) {
            newName = `new${type.charAt(0).toUpperCase() + type.slice(1)}${++counter}`;
        }

        const baseParam = { id: `param-${Date.now()}`, name: newName };
        let newParam: Parameter;
        if (type === 'float') {
            newParam = { ...baseParam, type: 'float', value: 0, min: 0, max: 10 };
        } else {
            newParam = { ...baseParam, type, value: false };
        }
        
        setParameters(prev => [...prev, newParam]);
        setIsMenuOpen(false);
    };

    const updateParameterName = (id: string, newName: string) => {
        // Basic validation to avoid duplicate names
        if (parameters.some(p => p.id !== id && p.name === newName)) return;
        setParameters(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
    };

    const updateParameterRange = (id: string, field: 'min' | 'max', value: number) => {
        setParameters(prev => prev.map(p => {
            if (p.id === id && p.type === 'float') {
                const updatedParam = { ...p, [field]: isNaN(value) ? p[field] : value };

                // Prevent min from exceeding max
                if (updatedParam.min > updatedParam.max) {
                    if (field === 'min') updatedParam.min = updatedParam.max;
                    if (field === 'max') updatedParam.max = updatedParam.min;
                }
                
                // Clamp current value
                if (updatedParam.value < updatedParam.min) updatedParam.value = updatedParam.min;
                if (updatedParam.value > updatedParam.max) updatedParam.value = updatedParam.max;

                return updatedParam;
            }
            return p;
        }));
    };

    const deleteParameter = (id: string) => {
        setParameters(prev => prev.filter(p => p.id !== id));
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2 px-2">
                <h2 className="text-lg font-bold text-slate-300">Parameters</h2>
                <div className="relative">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center text-xs bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-md font-semibold transition-colors"
                    >
                        <PlusIcon /> Add New <ChevronDownIcon />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-32 bg-slate-700 border border-slate-600 rounded-md shadow-lg z-10">
                            <button onClick={() => addParameter('float')} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">Float</button>
                            <button onClick={() => addParameter('boolean')} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">Boolean</button>
                            <button onClick={() => addParameter('trigger')} className="block w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600">Trigger</button>
                        </div>
                    )}
                </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {parameters.map(param => (
                    <div key={param.id} className="bg-slate-800 p-2 rounded-lg space-y-2 border border-slate-700">
                        <div className="flex items-center space-x-2">
                             <input
                                type="text"
                                value={param.name}
                                onChange={(e) => updateParameterName(param.id, e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-sm w-full focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
                            />
                            <button onClick={() => deleteParameter(param.id)} className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded-full flex-shrink-0">
                                <XIcon />
                            </button>
                        </div>
                        {param.type === 'float' && (
                            <>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="range" min={param.min} max={param.max} step="0.01" value={param.value}
                                        onChange={(e) => onUpdateValue(param.id, parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                    />
                                    <span className="font-mono text-sm text-teal-300 w-12 text-center">{param.value.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between space-x-2 text-xs mt-2">
                                    <div className="flex items-center space-x-1.5">
                                        <label htmlFor={`min-${param.id}`} className="text-slate-400 font-medium">Min</label>
                                        <input
                                            id={`min-${param.id}`}
                                            type="number"
                                            step="0.1"
                                            value={param.min}
                                            onChange={(e) => updateParameterRange(param.id, 'min', parseFloat(e.target.value))}
                                            className="bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 w-16 text-center text-slate-200 outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                        <label htmlFor={`max-${param.id}`} className="text-slate-400 font-medium">Max</label>
                                        <input
                                            id={`max-${param.id}`}
                                            type="number"
                                            step="0.1"
                                            value={param.max}
                                            onChange={(e) => updateParameterRange(param.id, 'max', parseFloat(e.target.value))}
                                            className="bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 w-16 text-center text-slate-200 outline-none focus:ring-1 focus:ring-teal-500"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        {param.type === 'boolean' && (
                           <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={param.value} onChange={(e) => onUpdateValue(param.id, e.target.checked)} className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"/>
                                <span className="text-sm text-slate-300">{param.value ? 'true' : 'false'}</span>
                           </label>
                        )}
                        {param.type === 'trigger' && (
                            <button onClick={() => onUpdateValue(param.id, true)} className="w-full text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-semibold transition-colors">
                                Trigger
                            </button>
                        )}
                    </div>
                ))}
                 {parameters.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4 px-2">No parameters defined. Click 'Add New' to create one for controlling transitions.</p>
                )}
            </div>
        </div>
    );
};