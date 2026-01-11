import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { NodeType, Node, Column, Row, ColumnType, AIConfig, ExternalInput, ViewFilter, FilterCondition } from './types';
import Sidebar from './components/Sidebar';
import FileView from './components/FileView';
import AIToolModal from './components/AIToolModal';
import MoveNodeModal from './components/MoveNodeModal';
import LockScreen from './components/LockScreen';

const STORAGE_KEY = 'OMNIDATA_EXPLORER_V1';
const AUTH_KEY = 'OMNIDATA_AUTH_STATUS';
const MASTER_PIN = '1234';

const INITIAL_DATA: Node = {
  id: 'root',
  parentId: null,
  name: '내 워크스페이스',
  type: NodeType.FOLDER,
  columns: [],
  rows: [],
  children: []
};

function App() {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  });

  const [root, setRoot] = useState<Node>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_DATA;
      }
    }
    return INITIAL_DATA;
  });

  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<{ nodeId: string; colId: string; colType: ColumnType } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [movingNodeId, setMovingNodeId] = useState<string | null>(null);

  const isRecalculating = useRef(false);

  useEffect(() => {
    if (isAuthorized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
    }
  }, [root, isAuthorized]);

  const handleUnlock = () => {
    setIsAuthorized(true);
    sessionStorage.setItem(AUTH_KEY, 'true');
  };

  const isMobile = useMemo(() => window.innerWidth < 768, []);

  const exportData = () => {
    const dataStr = JSON.stringify(root, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `omnidata_backup_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.id === 'root') {
          if (confirm('현재의 모든 데이터가 덮어씌워집니다. 계속하시겠습니까?')) {
            setRoot(json);
            alert('데이터 복구가 완료되었습니다.');
          }
        } else {
          alert('올바른 데이터 형식이 아닙니다.');
        }
      } catch (err) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const findNode = (id: string, current: Node): Node | null => {
    if (current.id === id) return current;
    if (current.children) {
      for (const child of current.children) {
        const found = findNode(id, child);
        if (found) return found;
      }
    }
    return null;
  };

  // 현재 노드의 부모 경로 전체를 찾는 함수 (Breadcrumbs용)
  const getPath = (id: string, current: Node, currentPath: Node[] = []): Node[] | null => {
    const path = [...currentPath, current];
    if (current.id === id) return path;
    if (current.children) {
      for (const child of current.children) {
        const found = getPath(id, child, path);
        if (found) return found;
      }
    }
    return null;
  };

  const updateNodeInTree = (tree: Node, targetId: string, updater: (node: Node) => Node): Node => {
    if (tree.id === targetId) return updater(tree);
    if (tree.children) {
      return {
        ...tree,
        children: tree.children.map(child => updateNodeInTree(child, targetId, updater))
      };
    }
    return tree;
  };

  const toISODate = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val.toString();
      return d.toISOString().split('T')[0];
    } catch (e) { return val.toString(); }
  };

  const buildContext = (currentRoot: Node, externalRefs: ExternalInput[] = []) => {
    const now = new Date();
    const context: Record<string, any> = {
      '현재 시간': now.toLocaleTimeString(),
      '오늘 날짜': now,
      '현재 타임스탬프': now.getTime(),
      'formatDate': (d: any) => toISODate(d)
    };
    externalRefs.forEach(ref => {
      const targetNode = findNode(ref.nodeId, currentRoot);
      if (targetNode && targetNode.type === NodeType.FILE) {
        const values = targetNode.rows.map(r => r.data[ref.columnId]).filter(v => v !== undefined && v !== '');
        context[ref.alias] = values;
      }
    });
    return context;
  };

  const executeAILogic = (config: AIConfig, rowData: Record<string, any>, columns: Column[], currentRoot: Node): string => {
    if (!config.logicCode) return '';
    try {
      const globalContext = buildContext(currentRoot, config.externalInputs);
      const mappedRow: Record<string, any> = {};
      columns.forEach(c => { 
        const val = rowData[c.id];
        if (c.type === ColumnType.TIMER && val) {
          const total = val.totalSeconds || 0;
          const elapsed = val.startTime ? Math.floor((Date.now() - val.startTime) / 1000) : 0;
          mappedRow[c.name] = total + elapsed;
        } else if (c.type === ColumnType.DATE && val) {
          mappedRow[c.name] = new Date(val);
        } else {
          mappedRow[c.name] = val;
        }
      });
      
      const execute = new Function('row', 'global', `try { ${config.logicCode} } catch(e) { return "Error: " + e.message; }`);
      const result = execute(mappedRow, globalContext);
      
      if (result === undefined || result === null) return '';
      const outputCol = columns.find(c => c.id === config.outputColumnId);
      if (outputCol?.type === ColumnType.DATE || result instanceof Date) return toISODate(result);
      return result.toString();
    } catch (e: any) { return 'Error'; }
  };

  const calculateFileFormulas = (node: Node, currentRoot: Node): Node => {
    if (node.type !== NodeType.FILE) return node;
    const formulaCols = node.columns.filter(c => c.type === ColumnType.AI_FORMULA && c.aiConfig?.logicCode);
    if (formulaCols.length === 0) return node;

    let changed = false;
    const updatedRows = node.rows.map(row => {
      let newData = { ...row.data };
      let rowChanged = false;
      formulaCols.forEach(col => {
        const res = executeAILogic(col.aiConfig!, newData, node.columns, currentRoot);
        if (newData[col.id] !== res) { newData[col.id] = res; rowChanged = true; changed = true; }
      });
      return rowChanged ? { ...row, data: newData } : row;
    });

    return changed ? { ...node, rows: updatedRows } : node;
  };

  const recalculateAll = (currentRoot: Node): Node => {
    const process = (node: Node, ref: Node): Node => {
      let n = node.type === NodeType.FILE ? calculateFileFormulas(node, ref) : node;
      if (n.children) {
        const nextChildren = n.children.map(c => process(c, ref));
        if (nextChildren.some((c, i) => c !== n.children![i])) n = { ...n, children: nextChildren };
      }
      return n;
    };
    let pass1 = process(currentRoot, currentRoot);
    if (pass1 === currentRoot) return currentRoot;
    return process(pass1, pass1);
  };

  useEffect(() => {
    if (!isAuthorized) return;
    const interval = setInterval(() => {
      if (isRecalculating.current) return;
      setRoot(prev => {
        const next = recalculateAll(prev);
        return next === prev ? prev : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  const activeFile = useMemo(() => activeFileId ? findNode(activeFileId, root) : null, [activeFileId, root]);
  const activePath = useMemo(() => activeFileId ? getPath(activeFileId, root) : [], [activeFileId, root]);
  const sampleRowData = useMemo(() => activeFile && activeFile.rows.length > 0 ? activeFile.rows[0].data : undefined, [activeFile]);

  const addRow = () => {
    if (!activeFile) return;
    setRoot(prev => recalculateAll(updateNodeInTree(prev, activeFile.id, n => ({
      ...n,
      rows: [...n.rows, { id: Math.random().toString(36).substr(2, 9), data: {} }]
    }))));
  };

  const handleRunTool = (rid: string, cid: string, config: AIConfig) => {
    if (!activeFile) return;
    setRoot(prev => recalculateAll(updateNodeInTree(prev, activeFile.id, node => ({
      ...node,
      rows: node.rows.map(row => row.id === rid ? { ...row, data: { ...row.data, [cid]: executeAILogic(config, row.data, node.columns, prev) } } : row)
    }))));
  };

  const addNode = (parentId: string, type: NodeType, inheritFromId?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    let columns: any[] = [];
    if (inheritFromId) {
      const inherit = findNode(inheritFromId, root);
      if (inherit) columns = inherit.columns.map(c => ({ ...c, id: Math.random().toString(36).substr(2, 9) }));
    }
    const newNode: Node = { id, parentId, name: type === NodeType.FOLDER ? '새 폴더' : '데이터 시트', type, columns, rows: [], views: [], children: type === NodeType.FOLDER ? [] : undefined };
    setRoot(prev => recalculateAll(updateNodeInTree(prev, parentId, n => ({ ...n, children: [...(n.children || []), newNode] }))));
    if (type === NodeType.FILE) { 
      setActiveFileId(id); 
      setActiveViewId(null); 
      if (isMobile) setIsSidebarOpen(false);
    }
  };

  if (!isAuthorized) {
    return <LockScreen onUnlock={handleUnlock} correctPin={MASTER_PIN} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 overflow-hidden relative">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
        className={`fixed top-4 left-4 z-[60] p-3 bg-white border border-slate-200 rounded-2xl shadow-xl hover:bg-slate-50 transition-all duration-300 ${isSidebarOpen && !isMobile ? 'translate-x-[260px]' : 'translate-x-0'}`}
      >
        <i className={`fa-solid ${isSidebarOpen ? 'fa-angles-left' : 'fa-bars-staggered'} text-indigo-600`}></i>
      </button>

      {isMobile && isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className={`fixed md:relative z-50 h-full transition-all duration-300 ease-in-out bg-white ${isSidebarOpen ? 'w-72 border-r border-gray-100 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 overflow-hidden'}`}>
        <Sidebar 
          root={root} activeFileId={activeFileId} 
          onSelectFile={(id) => { setActiveFileId(id); setActiveViewId(null); if (isMobile) setIsSidebarOpen(false); }} 
          onAddNode={addNode} 
          onDeleteNode={(id, pid) => setRoot(prev => updateNodeInTree(prev, pid, n => ({ ...n, children: (n.children || []).filter(c => c.id !== id) })))} 
          onRenameNode={(id, name) => setRoot(prev => updateNodeInTree(prev, id, n => ({ ...n, name })))} 
          onStartMove={setMovingNodeId}
          onExport={exportData}
          onImport={importData}
        />
      </div>
      
      <main className="flex-1 overflow-hidden p-4 md:p-8 flex flex-col relative">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
           <button 
             onClick={() => { sessionStorage.removeItem(AUTH_KEY); setIsAuthorized(false); }}
             className="text-[9px] font-black text-slate-400 bg-white border border-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm hover:bg-rose-50 hover:text-rose-500 transition-colors"
           >
              <i className="fa-solid fa-lock"></i>
              보안 잠금
           </button>
        </div>

        {activeFile ? (
          <FileView 
            file={activeFile} path={activePath || []} activeViewId={activeViewId} onSelectView={setActiveViewId} onUpdateViews={(v) => setRoot(prev => updateNodeInTree(prev, activeFile.id, n => ({ ...n, views: v })))}
            onAddColumn={(type) => setRoot(prev => updateNodeInTree(prev, activeFile.id, n => ({ ...n, columns: [...n.columns, { id: Math.random().toString(36).substr(2, 9), name: '새 열', type }] })))}
            onAddRow={addRow} onUpdateCell={(rid, cid, val) => setRoot(prev => recalculateAll(updateNodeInTree(prev, activeFile.id, n => ({ ...n, rows: n.rows.map(r => r.id === rid ? { ...r, data: { ...r.data, [cid]: val } } : r) }))))}
            onOpenToolCreator={(cid, type) => { setModalTarget({ nodeId: activeFile.id, colId: cid, colType: type }); setIsAIModalOpen(true); }} onRunTool={handleRunTool}
            onAddChildFile={() => addNode(activeFile.parentId || 'root', NodeType.FILE, activeFile.id)}
            onRenameColumn={(cid, name) => setRoot(prev => updateNodeInTree(prev, activeFile.id, n => ({ ...n, columns: n.columns.map(c => c.id === cid ? { ...c, name } : c) })))}
            onDeleteColumn={(cid) => setRoot(prev => updateNodeInTree(prev, activeFile.id, n => ({ ...n, columns: n.columns.filter(c => c.id !== cid) })))}
            onMoveColumn={(cid, dir) => setRoot(prev => updateNodeInTree(prev, activeFile.id, node => {
              const idx = node.columns.findIndex(c => c.id === cid);
              const tidx = dir === 'left' ? idx - 1 : idx + 1;
              if (tidx < 0 || tidx >= node.columns.length) return node;
              const newCols = [...node.columns]; [newCols[idx], newCols[tidx]] = [newCols[tidx], newCols[idx]];
              return { ...node, columns: newCols };
            }))}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-200">
            <i className="fa-solid fa-cube text-9xl mb-8 opacity-10"></i>
            <p className="text-xl md:text-2xl font-black text-slate-300 uppercase tracking-tighter text-center px-6">사이드바에서 파일을 선택하세요</p>
          </div>
        )}
      </main>

      {isAIModalOpen && modalTarget && (
        <AIToolModal 
          root={root} targetColId={modalTarget.colId} onClose={() => setIsAIModalOpen(false)} 
          onSave={(cfg) => { setRoot(prev => recalculateAll(updateNodeInTree(prev, modalTarget.nodeId, n => ({ ...n, columns: n.columns.map(c => c.id === modalTarget.colId ? { ...c, aiConfig: cfg } : c) })))); setIsAIModalOpen(false); }} 
          currentColumns={activeFile?.columns || []} type={modalTarget.colType} sampleRow={sampleRowData}
        />
      )}

      {movingNodeId && (
        <MoveNodeModal root={root} movingNodeId={movingNodeId} onClose={() => setMovingNodeId(null)} onConfirm={(targetId) => {
          setRoot(prev => {
            let movingNode: Node | null = null;
            const rootWithoutNode = updateNodeInTree(prev, 'root', (node) => {
              const remove = (n: Node): Node => {
                if (n.children) {
                  const idx = n.children.findIndex(c => c.id === movingNodeId);
                  if (idx !== -1) { movingNode = { ...n.children[idx], parentId: targetId }; return { ...n, children: n.children.filter(c => c.id !== movingNodeId) }; }
                  return { ...n, children: n.children.map(remove) };
                }
                return n;
              };
              return remove(node);
            });
            if (!movingNode) return prev;
            return recalculateAll(updateNodeInTree(rootWithoutNode, targetId, n => ({ ...n, children: [...(n.children || []), movingNode!] })));
          });
          setMovingNodeId(null);
        }} />
      )}
    </div>
  );
}

export default App;