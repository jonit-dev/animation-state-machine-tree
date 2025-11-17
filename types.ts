export interface Point {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  name: string;
  position: Point;
  width: number;
  height: number;
  isDefault?: boolean;
}

export enum ConditionOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  EQUALS = '==',
  NOT_EQUALS = '!=',
}

export enum BooleanOperator {
  IS_TRUE = 'is true',
  IS_FALSE = 'is false',
}

export interface Condition {
  id: string;
  parameter: string;
  operator: ConditionOperator | BooleanOperator;
  value: number; // For floats. Ignored for booleans.
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  conditions: Condition[];
  duration: number;
  hasExitTime: boolean;
}

export type Parameter =
  | { id: string; name: string; type: 'float'; value: number; min: number; max: number }
  | { id: string; name: string; type: 'boolean'; value: boolean }
  | { id: string; name: string; type: 'trigger'; value: boolean };

export interface ModelConfig {
  url: string;
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
}