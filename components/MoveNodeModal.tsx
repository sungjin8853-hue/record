import React, { useState } from 'react';
import { Node, NodeType } from '../types';

interface MoveNodeModalProps {
  root: Node;
  movingNodeId: string;
  onClose: () => void;
  onConfirm: (targetParentId: string) => void;
}

const FolderItem: React.FC<{ 
  node: Node; 
  depth: number; 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  disabledIds: Set<string>;
}> = ({ node, depth, selectedId, onSelect, disabledIds }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isDisabled = disabledIds.has(node.id);

  if (node.type !== NodeType.FOLDER) return null;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center p-2 rounded-xl transition-all mb-1 ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'} ${selectedId === node.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-600'}`}
        style={{ marginLeft: `${depth * 16}px` }}
        onClick={() => !isDisabled && onSelect(node.id)}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="w-4 mr-2 flex items-center justify-center hover:bg-black/10 rounded"
        >
          {node.children && node.children.some(c => c.type === NodeType.FOLDER) && (
            <i className={`fa-solid fa-caret-right text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}></i>
          )}
        </button>
        <i className={`fa-solid ${isOpen ? 'fa-folder-open' : 'fa-folder'} mr-3 text-sm opacity-60 text-amber-400`}></i>
        <span className="text-sm font-bold truncate">{node.name}</span>
      </div>
      {isOpen && node.children && (
        <div>
          {node.children.map(child => (
            <FolderItem 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              selectedId={selectedId} 
              onSelect={onSelect} 
              disabledIds={disabledIds}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MoveNodeModal: React.FC<MoveNodeModalProps> = ({ root, movingNodeId, onClose, onConfirm }) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  // 이동할 노드와 그 하위 노드들은 이동 대상으로 선택할 수 없도록 계산
  const getDisabledIds = (node: Node, targetId: string, currentDisabled: Set<string> = new Set()): Set<string> => {
    if (node.id === targetId) {
      const collect = (n: Node) => {
        currentDisabled.add(n.id);
        n.children?.forEach(collect);
      };
      collect(node);
    } else {
      node.children?.forEach(c => getDisabledIds(c, targetId, currentDisabled));
    }
    return currentDisabled;
  };

  const disabledIds = getDisabledIds(root, movingNodeId);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[80vh] border border-slate-200">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-right-to-bracket text-indigo-500"></i>
            대상 폴더 선택
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-all">
            <i className="fa-solid fa-xmark text-slate-400"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-white min-h-[300px]">
          <FolderItem 
            node={root} 
            depth={0} 
            selectedId={selectedTargetId} 
            onSelect={setSelectedTargetId} 
            disabledIds={disabledIds}
          />
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest">취소</button>
          <button 
            disabled={!selectedTargetId}
            onClick={() => selectedTargetId && onConfirm(selectedTargetId)}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            이동하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveNodeModal;