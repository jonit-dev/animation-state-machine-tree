import React, { useState, useEffect } from 'react';
import type { Connection, Condition, Parameter } from '../types';
import { ConditionOperator, BooleanOperator } from '../types';

interface ConditionsPanelProps {
  connection: Connection;
  parameters: Parameter[];
  onClose: () => void;
  onUpdate: (connection: Connection) => void;
  onDelete: (id: string) => void;
}

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

export const ConditionsPanel: React.FC<ConditionsPanelProps> = ({ connection, parameters, onClose, onUpdate, onDelete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in on mount
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleTransitionEnd = () => {
    if (!isVisible) {
      onClose();
    }
  };
  
  const addCondition = () => {
    if (parameters.length === 0) return;
    const firstParam = parameters[0];
    const newCondition: Condition = {
      id: `cond-${Date.now()}`,
      parameter: firstParam.name,
      operator: firstParam.type === 'float' ? ConditionOperator.GREATER_THAN : BooleanOperator.IS_TRUE,
      value: 0.1,
    };
    onUpdate({ ...connection, conditions: [...connection.conditions, newCondition] });
  };

  const updateCondition = (id: string, field: keyof Omit<Condition, 'id'>, value: string | number | ConditionOperator | BooleanOperator) => {
    const updatedConditions = connection.conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    );
    onUpdate({ ...connection, conditions: updatedConditions });
  };
  
  const handleParameterChange = (id: string, newParamName: string) => {
      const param = parameters.find(p => p.name === newParamName);
      if (!param) return;
      const newOperator = param.type === 'float' ? ConditionOperator.GREATER_THAN : BooleanOperator.IS_TRUE;
      const updatedConditions = connection.conditions.map(c => 
        c.id === id ? { ...c, parameter: newParamName, operator: newOperator } : c
      );
      onUpdate({ ...connection, conditions: updatedConditions });
  };

  const removeCondition = (id: string) => {
    const updatedConditions = connection.conditions.filter(c => c.id !== id);
    onUpdate({ ...connection, conditions: updatedConditions });
  };

  const commonInputStyle = "bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-sm w-full focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition";

  return (
    <div 
      className={`absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl w-96 p-4 z-20 flex flex-col transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-100">Transition Settings</h3>
        <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors rounded-full p-1"><XIcon /></button>
      </div>

      <div className='space-y-3 mb-4 border-b border-slate-700 pb-4'>
          <div className='flex items-center justify-between'>
            <label htmlFor="hasExitTime" className="text-sm font-medium text-slate-300">Has Exit Time</label>
            <input 
                type="checkbox" 
                id="hasExitTime"
                checked={connection.hasExitTime}
                onChange={e => onUpdate({ ...connection, hasExitTime: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-teal-500 focus:ring-teal-500"
            />
          </div>
          <div className='flex items-center justify-between'>
            <label htmlFor="duration" className="text-sm font-medium text-slate-300">Transition Duration (s)</label>
            <input 
                type="number" 
                id="duration"
                step="0.05"
                min="0"
                value={connection.duration}
                onChange={e => onUpdate({ ...connection, duration: parseFloat(e.target.value) || 0 })}
                className={`${commonInputStyle} w-24`}
            />
          </div>
      </div>
      
      <h4 className="font-bold text-base text-slate-200 mb-2">Conditions</h4>
      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 flex-grow">
        {connection.conditions.map(cond => {
          const selectedParam = parameters.find(p => p.name === cond.parameter);
          const isFloat = selectedParam?.type === 'float';

          return (
          <div key={cond.id} className="bg-slate-900/50 p-2 rounded-lg flex items-center space-x-2 border border-slate-700">
            <select
              value={cond.parameter}
              onChange={(e) => handleParameterChange(cond.id, e.target.value)}
              className={`${commonInputStyle} flex-1`}
            >
              {parameters.length > 0 ? 
                parameters.map(p => <option key={p.id} value={p.name}>{p.name}</option>) :
                <option disabled>No parameters</option>
              }
            </select>
            <select
              value={cond.operator}
              onChange={(e) => updateCondition(cond.id, 'operator', e.target.value as ConditionOperator | BooleanOperator)}
              className={`${commonInputStyle} w-auto`}
            >
              {isFloat 
                ? Object.values(ConditionOperator).map(op => <option key={op} value={op}>{op}</option>)
                : Object.values(BooleanOperator).map(op => <option key={op} value={op}>{op}</option>)
              }
            </select>
            {isFloat && (
                <input 
                  type="number"
                  step="0.01"
                  value={cond.value}
                  onChange={(e) => updateCondition(cond.id, 'value', parseFloat(e.target.value))}
                  className={`${commonInputStyle} w-24 text-center`}
                />
            )}
            <button onClick={() => removeCondition(cond.id)} className="text-slate-500 hover:text-red-500 transition-colors p-1 rounded-full">
                <XIcon />
            </button>
          </div>
        )})}
         {connection.conditions.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">No conditions. This transition will happen if it has exit time or immediately.</p>
        )}
      </div>

      <div className="flex justify-between items-center border-t border-slate-700 pt-4">
        <button onClick={addCondition} disabled={parameters.length === 0} className="flex items-center text-sm bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded-md font-semibold transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">
            <PlusIcon/> Add Condition
        </button>
        <button onClick={() => onDelete(connection.id)} className="text-sm bg-red-600 hover:bg-red-500 px-3 py-2 text-white rounded-md font-semibold transition-colors">
          Delete Transition
        </button>
      </div>
    </div>
  );
};