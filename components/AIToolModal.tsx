
import React, { useState, useMemo, useEffect } from 'react';
import { Column, ColumnType, AIConfig, Node, ExternalInput, NodeType } from '../types';
import { suggestAIConfig } from '../geminiService';

interface AIToolModalProps {
  root: Node;
  targetColId: string;
  onClose: () => void;
  onSave: (config: AIConfig) => void;
  currentColumns: Column[];
  type: ColumnType;
  // 테스트용 데이터 (첫 번째 행)
  sampleRow?: Record<string, any>;
}

const AIToolModal: React.FC<AIToolModalProps> = ({ root, targetColId, onClose, onSave, currentColumns, type, sampleRow }) => {
  const targetCol = useMemo(() => currentColumns.find(c => c.id === targetColId), [currentColumns, targetColId]);
  const existingConfig = targetCol?.aiConfig;

  const [desc, setDesc] = useState(existingConfig?.prompt || '');
  const [logicCode, setLogicCode] = useState(existingConfig?.logicCode || '');
  const [inputs, setInputs] = useState<string[]>(existingConfig?.inputPaths || []);
  const [externalInputs, setExternalInputs] = useState<ExternalInput[]>(existingConfig?.externalInputs || []);
  const [loading, setLoading] = useState(false);
  const [outputId, setOutputId] = useState(targetColId);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setOutputId(targetColId);
  }, [targetColId]);

  // 로직 테스트 실행 함수
  const runTest = () => {
    if (!logicCode) return;
    try {
      const row = sampleRow || {};
      const global = { 
        '오늘 날짜': new Date(), 
        '현재 시간': new Date().toLocaleTimeString(),
        'formatDate': (d: any) => d instanceof Date ? d.toISOString().split('T')[0] : String(d)
      };
      const execute = new Function('row', 'global', `try { ${logicCode} } catch(e) { return "Error: " + e.message; }`);
      const res = execute(row, global);
      setTestResult(res?.toString() || '값 없음');
    } catch (e: any) {
      setTestResult('문법 오류: ' + e.message);
    }
  };

  useEffect(() => {
    if (logicCode) runTest();
  }, [logicCode]);

  const findFiles = (node: Node, acc: Node[] = []): Node[] => {
    if (node.type === NodeType.FILE) acc.push(node);
    node.children?.forEach(c => findFiles(c, acc));
    return acc;
  };

  const allFiles = useMemo(() => findFiles(root), [root]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const selectedFile = useMemo(() => allFiles.find(f => f.id === activeFileId), [allFiles, activeFileId]);

  const handleAddExternal = (col: Column) => {
    if (!selectedFile) return;
    const alias = `${selectedFile.name}_${col.name}`.replace(/\s+/g, '_');
    if (externalInputs.find(ex => ex.alias === alias)) return;
    setExternalInputs([...externalInputs, { nodeId: selectedFile.id, nodeName: selectedFile.name, columnId: col.id, columnName: col.name, alias }]);
  };

  const handleAutoDesign = async () => {
    if (!desc) return;
    setLoading(true);
    try {
      const currentFieldNames = currentColumns.map(c => c.name);
      const externalAliases = externalInputs.map(ex => ex.alias);
      const result = await suggestAIConfig(desc, currentFieldNames, externalAliases);
      setLogicCode(result.logicCode);
      setInputs(result.inputPaths);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[92vh] border border-white/20">
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black flex items-center gap-3">
              <i className="fa-solid fa-microchip"></i> 로직 제어 센터
            </h3>
            <p className="opacity-70 mt-1 text-sm">프롬프트로 생성된 JavaScript 코드가 이 열의 데이터 계산을 책임집니다.</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-all">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 grid grid-cols-12 gap-10">
          <div className="col-span-7 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">1. AI 코드 생성 (가이드 작성)</label>
              <div className="flex gap-3">
                <input 
                  className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-slate-700 transition-all"
                  placeholder="예: 마감일이 오늘보다 이전이면 '지연' 출력"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                />
                <button onClick={handleAutoDesign} disabled={loading} className="px-8 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100">
                  {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : "AI 코드 제안"}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                <span>2. 실행 소스 코드 (Source Code)</span>
                <span className="text-indigo-500 font-black">JavaScript</span>
              </label>
              <div className="relative group">
                <textarea 
                  className="w-full p-6 bg-slate-900 text-emerald-400 font-mono text-[13px] rounded-3xl outline-none min-h-[400px] border border-slate-800 shadow-inner leading-relaxed focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  value={logicCode}
                  onChange={e => setLogicCode(e.target.value)}
                  placeholder="return row['필드명'] * 2;"
                />
                <div className="absolute bottom-4 right-4 bg-black/50 px-3 py-1.5 rounded-lg backdrop-blur-sm text-[10px] text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                  실시간 편집 중
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-5 space-y-8 border-l border-slate-100 pl-10">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">실시간 테스트 프리뷰</label>
               <div className={`p-6 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center min-h-[120px] transition-all ${testResult?.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-indigo-600'}`}>
                  <span className="text-[10px] font-black opacity-40 uppercase mb-2">계산 결과 예시</span>
                  <span className="text-xl font-black text-center">{testResult || '코드를 입력하세요'}</span>
               </div>
            </div>

            <div className="space-y-5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">외부 시트 데이터 참조</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none" onChange={e => setActiveFileId(e.target.value)} value={activeFileId || ''}>
                <option value="">데이터 시트 선택...</option>
                {allFiles.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              {selectedFile && (
                <div className="flex flex-wrap gap-2">
                  {selectedFile.columns.map(c => (
                    <button key={c.id} onClick={() => handleAddExternal(c)} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[9px] font-bold border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-colors">
                      + {c.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                {externalInputs.map(ex => (
                  <div key={ex.alias} className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <code className="text-[10px] font-black text-indigo-600">global['{ex.alias}']</code>
                    <button onClick={() => setExternalInputs(externalInputs.filter(i => i.alias !== ex.alias))} className="text-rose-400 hover:text-rose-600">
                      <i className="fa-solid fa-circle-xmark text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
              <h4 className="text-[10px] font-black text-amber-700 uppercase mb-2">활용 가능한 변수</h4>
              <ul className="text-[10px] text-amber-600 space-y-2 font-medium leading-relaxed">
                <li><code className="bg-amber-200/50 px-1 rounded">row['열이름']</code> : 현재 행의 데이터</li>
                <li><code className="bg-amber-200/50 px-1 rounded">global['오늘 날짜']</code> : 현재 시스템 날짜</li>
                <li><code className="bg-amber-200/50 px-1 rounded">global['현재 시간']</code> : 1초 단위 갱신 시각</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
          <button onClick={onClose} className="px-8 py-4 text-sm font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest">취소</button>
          <button 
            disabled={!logicCode}
            onClick={() => onSave({ prompt: desc, inputPaths: inputs, externalInputs, outputColumnId: outputId, logicCode })}
            className="px-14 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-40"
          >
            로직 코드 저장 및 엔진 적용
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIToolModal;
