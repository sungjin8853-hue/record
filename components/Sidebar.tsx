import React, { useState, useRef } from 'react';
import { Node, NodeType } from '../types';

interface SidebarProps {
  root: Node;
  activeFileId: string | null;
  onSelectFile: (id: string) => void;
  onAddNode: (parentId: string, type: NodeType) => void;
  onDeleteNode: (id: string, parentId: string) => void;
  onRenameNode: (id: string, name: string) => void;
  onStartMove: (id: string) => void;
  onExport?: () => void;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const NodeItem: React.FC<{
  node: Node, 
  depth: number, 
  activeId: string | null,
  onSelect: (id: string) => void,
  onAdd: (pid: string, t: NodeType) => void,
  onDelete: (id: string, pid: string) => void,
  onRename: (id: string, n: string) => void,
  onStartMove: (id: string) => void
}> = ({ node, depth, activeId, onSelect, onAdd, onDelete, onRename, onStartMove }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === NodeType.FOLDER) {
      setIsOpen(!isOpen);
    } else {
      onSelect(node.id);
    }
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center p-2 rounded-xl group cursor-pointer transition-all mb-0.5 
          ${activeId === node.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-600'}
        `}
        style={{ marginLeft: `${depth * 8}px` }}
        onClick={handleToggle}
      >
        <span className="w-5 mr-1 flex items-center justify-center">
          {node.type === NodeType.FOLDER ? (
            <i className={`fa-solid fa-caret-right text-[10px] transition-transform duration-200 opacity-40 ${isOpen ? 'rotate-90' : ''}`}></i>
          ) : (
             <div className="w-1 h-1 rounded-full bg-slate-300 opacity-40"></div>
          )}
        </span>
        <i className={`fa-solid ${node.type === NodeType.FOLDER ? (isOpen ? 'fa-folder-open' : 'fa-folder') : 'fa-file-lines'} mr-3 text-sm opacity-80 ${node.type === NodeType.FOLDER ? (activeId === node.id ? 'text-white' : 'text-amber-400') : (activeId === node.id ? 'text-white' : 'text-indigo-400')}`}></i>
        
        {isEditing ? (
          <input 
            autoFocus 
            className="bg-white/20 text-inherit outline-none w-full px-2 py-0.5 rounded border border-white/30 text-sm font-bold"
            defaultValue={node.name}
            onBlur={(e) => { 
              const newName = e.target.value.trim();
              if (newName) onRename(node.id, newName);
              setIsEditing(false); 
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setIsEditing(false);
            }}
          />
        ) : (
          <span className="text-sm font-bold truncate flex-1">{node.name}</span>
        )}
        
        <div className="hidden group-hover:flex items-center gap-0.5 ml-2">
           {node.type === NodeType.FOLDER && (
             <>
               <button 
                 onClick={(e) => { e.stopPropagation(); onAdd(node.id, NodeType.FOLDER); setIsOpen(true); }} 
                 className="p-1.5 hover:bg-black/10 rounded-lg transition-colors" 
                 title="하위 폴더 추가"
               >
                 <i className="fa-solid fa-folder-plus text-[10px]"></i>
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onAdd(node.id, NodeType.FILE); setIsOpen(true); }} 
                 className="p-1.5 hover:bg-black/10 rounded-lg transition-colors" 
                 title="이 폴더에 파일 추가"
               >
                 <i className="fa-solid fa-file-circle-plus text-[10px]"></i>
               </button>
             </>
           )}
           <button 
             onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
             className="p-1.5 hover:bg-black/10 rounded-lg transition-colors" 
             title="이름 변경"
           >
             <i className="fa-solid fa-pen text-[10px]"></i>
           </button>
           <button 
             onClick={(e) => { e.stopPropagation(); onStartMove(node.id); }} 
             className="p-1.5 hover:bg-black/10 rounded-lg transition-colors" 
             title="이동"
           >
             <i className="fa-solid fa-up-down-left-right text-[10px]"></i>
           </button>
           {node.id !== 'root' && (
             <button 
               onClick={(e) => { 
                 e.stopPropagation(); 
                 if(confirm(`'${node.name}'을(를) 삭제하시겠습니까?`)) onDelete(node.id, node.parentId!); 
               }} 
               className="p-1.5 hover:bg-rose-500 hover:text-white rounded-lg transition-colors" 
               title="삭제"
             >
               <i className="fa-solid fa-trash text-[10px]"></i>
             </button>
           )}
        </div>
      </div>
      {isOpen && node.children && node.children.length > 0 && (
        <div className="border-l border-slate-200 ml-[18px] pl-2 mt-0.5 space-y-0.5">
          {node.children.map(child => (
            <NodeItem 
              key={child.id} 
              node={child} 
              depth={0} 
              activeId={activeId} 
              onSelect={onSelect} 
              onAdd={onAdd} 
              onDelete={onDelete} 
              onRename={onRename} 
              onStartMove={onStartMove}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = (props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full flex flex-col h-full bg-white z-20 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <h1 className="text-xl font-black tracking-tighter text-indigo-600 flex items-center gap-2">
          <i className="fa-solid fa-folder-tree text-2xl"></i>
          탐색기
        </h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        <NodeItem 
          node={props.root} 
          depth={0} 
          onSelect={props.onSelectFile} 
          onAdd={props.onAddNode} 
          onDelete={props.onDeleteNode} 
          onRename={props.onRenameNode} 
          onStartMove={props.onStartMove}
          activeId={props.activeFileId} 
        />
        
        <div className="mt-8 space-y-2">
           <p className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">데이터 관리</p>
           <div className="grid grid-cols-2 gap-2 px-2">
              <button 
                onClick={props.onExport}
                className="py-2.5 bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex flex-col items-center justify-center gap-1"
              >
                <i className="fa-solid fa-download"></i> 내보내기
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex flex-col items-center justify-center gap-1"
              >
                <i className="fa-solid fa-upload"></i> 가져오기
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={props.onImport}
              />
           </div>
        </div>
      </div>
      <div className="p-4 border-t border-gray-100 space-y-2 bg-slate-50/50">
         <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => props.onAddNode('root', NodeType.FOLDER)}
              className="py-3 text-slate-600 text-xs font-black rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-folder-plus"></i> 루트 폴더
            </button>
            <button 
              onClick={() => props.onAddNode('root', NodeType.FILE)}
              className="py-3 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
            >
              <i className="fa-solid fa-file-circle-plus"></i> 루트 파일
            </button>
         </div>
      </div>
    </div>
  );
};

export default Sidebar;