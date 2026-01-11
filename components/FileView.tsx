import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Node, ColumnType, Column, Row, ViewFilter, FilterCondition, FilterOperator, NodeType } from '../types';

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

const SmartBadge = ({ value }: { value: string }) => {
  if (!value) return <span className="text-slate-300">-</span>;
  const isWarning = value.includes('긴급') || value.includes('지연') || value.includes('위험');
  const isSuccess = value.includes('완료') || value.includes('정상') || value.includes('성공');
  const isInfo = value.includes('진행') || value.includes('D-');
  let colorClass = "bg-slate-100 text-slate-600 border-slate-200";
  if (isWarning) colorClass = "bg-rose-50 text-rose-600 border-rose-100";
  if (isSuccess) colorClass = "bg-emerald-50 text-emerald-600 border-emerald-100";
  if (isInfo) colorClass = "bg-indigo-50 text-indigo-600 border-indigo-100";
  return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-tight ${colorClass}`}>{value}</span>;
};

const TimerCell = ({ value, onChange }: { value: any, onChange: (v: any) => void }) => {
  const data = value || { totalSeconds: 0, startTime: null };
  const [displaySeconds, setDisplaySeconds] = useState(data.totalSeconds);
  const isRunning = data.startTime !== null;
  useEffect(() => {
    let interval: number;
    if (isRunning) {
      interval = window.setInterval(() => {
        const elapsedSinceStart = Math.floor((Date.now() - data.startTime!) / 1000);
        setDisplaySeconds(data.totalSeconds + elapsedSinceStart);
      }, 1000);
    } else { setDisplaySeconds(data.totalSeconds); }
    return () => clearInterval(interval);
  }, [isRunning, data]);
  const toggle = () => {
    if (isRunning) {
      const elapsedSinceStart = Math.floor((Date.now() - data.startTime!) / 1000);
      onChange({ totalSeconds: data.totalSeconds + elapsedSinceStart, startTime: null });
    } else { onChange({ ...data, startTime: Date.now() }); }
  };
  return (
    <div className="flex items-center gap-2 group/timer">
      <div className={`font-mono text-[11px] font-black px-2 py-1 rounded border ${isRunning ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-50 text-slate-500'}`}>{formatTime(displaySeconds)}</div>
      <button onClick={toggle} className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isRunning ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'}`}><i className={`fa-solid ${isRunning ? 'fa-pause text-[8px]' : 'fa-play text-[8px]'}`}></i></button>
    </div>
  );
};

const FileView: React.FC<FileViewProps> = (props) => {
  const { file, path, activeViewId, onSelectView, onUpdateViews, onAddColumn, onAddRow, onUpdateCell, onOpenToolCreator, onRunTool, onAddChildFile, onDeleteColumn } = props;
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(() => {
    const view = file.views?.find(v => v.id === activeViewId);
    if (!view) return file.rows;
    return file.rows.filter(row => {
      return view.conditions.every(cond => {
        const val = row.data[cond.columnId];
        switch (cond.operator) {
          case 'equals': return String(val || '') === String(cond.value || '');
          case 'contains': return String(val || '').includes(String(cond.value || ''));
          default: return true;
        }
      });
    });
  }, [file.rows, file.views, activeViewId]);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-6 md:p-8 border-b border-slate-100 bg-white sticky top-0 z-20">
        
        {/* Breadcrumbs (경로 표시) */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto scrollbar-hide">
          {path.map((p, i) => (
            <React.Fragment key={p.id}>
              {i > 0 && <i className="fa-solid fa-chevron-right text-[10px] text-slate-300"></i>}
              <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap ${i === path.length - 1 ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}>
                <i className={`fa-solid ${p.type === NodeType.FOLDER ? 'fa-folder' : 'fa-file-lines'} opacity-50`}></i>
                {p.name}
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter flex items-center">
            <i className="fa-solid fa-table-list text-indigo-500 mr-4"></i>
            {file.name}
          </h2>
          <div className="flex gap-2">
            <button onClick={onAddChildFile} className="flex-1 md:flex-none px-5 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">구조 복제</button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => onSelectView(null)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[10px] font-black transition-all ${!activeViewId ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}>전체 보기</button>
          {file.views?.map(v => (
            <button key={v.id} onClick={() => onSelectView(v.id)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[10px] font-black transition-all ${activeViewId === v.id ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'text-slate-400 hover:bg-slate-50'}`}>{v.name}</button>
          ))}
          <button onClick={() => onUpdateViews([...(file.views || []), { id: Math.random().toString(36).substr(2, 9), name: '새 필터', conditions: [] }])} className="text-slate-300 hover:text-indigo-500 transition-all ml-2"><i className="fa-solid fa-plus-circle text-sm"></i></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400">
               <th className="p-2 border-r border-slate-100">ID</th>
               {file.columns.map((c, i) => (
                 <th key={c.id} className="p-2 border-r border-slate-100 bg-slate-100/30">
                    {String.fromCharCode(65 + i)}열
                 </th>
               ))}
               <th></th>
            </tr>
            <tr className="bg-white border-b border-slate-100">
              <th className="w-12 p-3 text-[10px] text-slate-400 font-black">#</th>
              {file.columns.map((col) => (
                <th key={col.id} className="p-4 text-left font-black text-slate-500 min-w-[180px] group border-r border-slate-50 last:border-r-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-100 text-[9px] flex items-center justify-center text-slate-400">
                         {col.type === ColumnType.AI_FORMULA ? <i className="fa-solid fa-wand-sparkles text-indigo-500"></i> : <i className="fa-solid fa-font"></i>}
                      </span>
                      <span className="truncate max-w-[100px]">{col.name}</span>
                    </div>
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onOpenToolCreator(col.id, col.type)} className="p-1 text-indigo-400 hover:text-indigo-600"><i className="fa-solid fa-gear text-[10px]"></i></button>
                      <button onClick={() => onDeleteColumn(col.id)} className="p-1 text-slate-300 hover:text-rose-500"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                    </div>
                  </div>
                </th>
              ))}
              <th className="p-4 w-12 sticky right-0 bg-white z-10">
                <div className="relative" ref={colMenuRef}>
                  <button onClick={() => setIsColMenuOpen(!isColMenuOpen)} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-indigo-600 flex items-center justify-center hover:shadow-md transition-all"><i className="fa-solid fa-plus text-xs"></i></button>
                  {isColMenuOpen && (
                    <div className="absolute top-10 right-0 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-[100] animate-in fade-in slide-in-from-top-2">
                      {['TEXT', 'NUMBER', 'DATE', 'AI_BUTTON', 'AI_FORMULA', 'TIMER'].map(t => (
                        <button key={t} onClick={() => { onAddColumn(ColumnType[t as keyof typeof ColumnType]); setIsColMenuOpen(false); }} className="w-full px-4 py-2 text-left text-[10px] font-black text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3">{t}</button>
                      ))}
                    </div>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-indigo-50/20 border-b border-slate-50 transition-colors">
                <td className="p-3 text-center text-[10px] text-slate-300 font-black italic">{idx + 1}</td>
                {file.columns.map(col => (
                  <td key={col.id} className="p-2 border-r border-slate-50 last:border-r-0">
                    {['TEXT', 'NUMBER', 'DATE'].includes(col.type) ? (
                      <input className="w-full px-2 py-1.5 bg-transparent focus:bg-white rounded outline-none border border-transparent focus:border-indigo-300 transition-all font-bold text-slate-700 text-xs" 
                        type={col.type === ColumnType.DATE ? 'date' : 'text'} value={row.data[col.id] || ''} onChange={(e) => onUpdateCell(row.id, col.id, e.target.value)} />
                    ) : col.type === ColumnType.TIMER ? (
                      <TimerCell value={row.data[col.id]} onChange={(v) => onUpdateCell(row.id, col.id, v)} />
                    ) : col.type === ColumnType.AI_BUTTON ? (
                      <button onClick={() => onRunTool(row.id, col.id, col.aiConfig)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black shadow-sm hover:bg-indigo-700 transition-all">{col.aiConfig ? col.name : '설정'}</button>
                    ) : (
                      <div className="px-2"><SmartBadge value={row.data[col.id]} /></div>
                    )}
                  </td>
                ))}
                <td></td>
              </tr>
            ))}
            <tr>
              <td className="p-4" colSpan={file.columns.length + 2}>
                <button onClick={onAddRow} className="text-[11px] font-black text-indigo-500 hover:text-indigo-700 transition-all flex items-center gap-2">
                  <i className="fa-solid fa-plus-circle"></i> 새 데이터 행 추가
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface FileViewProps {
  file: Node; path: Node[]; activeViewId: string | null; onSelectView: (id: string | null) => void; onUpdateViews: (views: ViewFilter[]) => void;
  onAddColumn: (type: ColumnType) => void; onAddRow: () => void; onUpdateCell: (rid: string, cid: string, val: any) => void;
  onOpenToolCreator: (cid: string, type: ColumnType) => void; onRunTool: (rid: string, cid: string, config: any) => void;
  onAddChildFile: () => void; onRenameColumn: (cid: string, name: string) => void; onDeleteColumn: (cid: string) => void;
  onMoveColumn: (cid: string, dir: 'left' | 'right') => void;
}

export default FileView;