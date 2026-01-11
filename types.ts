
export enum NodeType {
  FOLDER = 'FOLDER',
  FILE = 'FILE'
}

export enum ColumnType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  AI_BUTTON = 'AI_BUTTON',
  AI_FORMULA = 'AI_FORMULA',
  TIMER = 'TIMER'
}

export type FilterOperator = 'equals' | 'contains' | 'gt' | 'lt' | 'date_is' | 'date_within';

export interface FilterCondition {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: any; // 'TODAY', '7', '30' or specific values
}

export interface ViewFilter {
  id: string;
  name: string;
  conditions: FilterCondition[];
}

export interface ExternalInput {
  nodeId: string;
  nodeName: string;
  columnId: string;
  columnName: string;
  alias: string;
}

export interface AIConfig {
  prompt: string;
  logicCode?: string; 
  inputPaths: string[];
  externalInputs?: ExternalInput[];
  outputColumnId: string;
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  aiConfig?: AIConfig;
}

export interface Row {
  id: string;
  data: Record<string, any>;
}

export interface Node {
  id: string;
  parentId: string | null;
  name: string;
  type: NodeType;
  columns: Column[];
  rows: Row[];
  views?: ViewFilter[]; // 파일 전용 뷰(필터) 목록
  children?: Node[];
}
