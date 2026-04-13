import React, { useState, useEffect } from 'react';
import { X, Trash2, User, FileEdit, Share2, Send, Users, Star, Smartphone, Zap, ZapOff, RefreshCcw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PropertiesPanel = ({ selectedElement, type, onUpdate, onDelete, onClose }) => {
  const [label, setLabel] = useState('');
  const [person, setPerson] = useState('');
  const [team, setTeam] = useState('');
  const [applicant, setApplicant] = useState('');
  const [method, setMethod] = useState('');
  const [isStar, setIsStar] = useState(false);
  
  // Edge specific states
  const [edgeMethod, setEdgeMethod] = useState('');
  const [automation, setAutomation] = useState('수동');

  const methods = [
    { value: '정해진 것 없음', label: '정해진 것 없음' },
    { value: '메일', label: '메일' },
    { value: '문자', label: '문자' },
    { value: '카카오톡', label: '카카오톡' },
    { value: '전화', label: '전화' },
    { value: '협업툴', label: '협업툴' }
  ];

  const automationTypes = [
    { value: '자동', icon: <Zap size={14} />, label: '자동' },
    { value: '반자동', icon: <RefreshCcw size={14} />, label: '반자동' },
    { value: '수동', icon: <ZapOff size={14} />, label: '수동' }
  ];

  // 요소가 선택될 때 초기 상태 설정
  useEffect(() => {
    if (selectedElement) {
      if (type === 'node') {
        setLabel(selectedElement.data.label || '');
        setPerson(selectedElement.data.person || '');
        setTeam(selectedElement.data.team || '');
        setApplicant(selectedElement.data.applicant || '');
        setMethod(selectedElement.data.method || '');
        setIsStar(selectedElement.data.isStar || false);
      } else {
        const edgeData = selectedElement.data || {};
        setEdgeMethod(edgeData.method || '정해진 것 없음');
        setAutomation(edgeData.automation || '수동');
      }
    }
  }, [selectedElement, type]);

  // 실시간 업데이트 함수 (Keystroke마다 호출)
  const handleLiveUpdate = (newData) => {
    if (type === 'node') {
      onUpdate(selectedElement.id, {
        label: label,
        person: person,
        team: team,
        applicant: applicant,
        method: method,
        isStar: isStar,
        ...newData // 새로 변경된 필드만 덮어씀
      });
    } else {
      // 엣지 실시간 업데이트: 라벨과 색상 포함
      const currentMethod = newData.method || edgeMethod;
      const currentAutomation = newData.automation || automation;
      
      const edgeColors = {
        '자동': '#3b82f6',
        '반자동': '#fbbf24',
        '수동': '#ef4444'
      };

      onUpdate(selectedElement.id, {
        method: currentMethod,
        automation: currentAutomation,
        label: currentMethod,
        style: { stroke: edgeColors[currentAutomation] || '#ef4444', strokeWidth: 4 },
        ...newData
      });
    }
  };

  if (!selectedElement) return null;

  const isTrigger = selectedElement.type === 'node_trigger';

  return (
    <motion.div
      className="properties-panel"
      initial={{ x: 350 }}
      animate={{ x: 0 }}
      exit={{ x: 350 }}
      transition={{ type: 'spring', damping: 20 }}
    >
      <div className="panel-header">
        <div className="status-badge"><span className="pulse"></span> 실시간 저장 중</div>
        <button onClick={onClose} className="close-btn"><X size={20} /></button>
      </div>

      <div className="panel-content">
        {type === 'node' ? (
          <>
            <div className="input-group">
              <label><FileEdit size={14} /> 업무 내용</label>
              <textarea
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  handleLiveUpdate({ label: e.target.value });
                }}
                placeholder="예: 기획안 작성, 데이터 수집 등"
                rows={3}
              />
            </div>

            {isTrigger ? (
              <>
                <div className="input-group">
                  <label><User size={14} /> 신청자</label>
                  <input
                    type="text"
                    value={applicant}
                    onChange={(e) => {
                      setApplicant(e.target.value);
                      handleLiveUpdate({ applicant: e.target.value });
                    }}
                    placeholder="예: 고객, 지점 원장 등"
                  />
                </div>

                <div className="input-group">
                  <label><Smartphone size={14} /> 신청 방법</label>
                  <input
                    type="text"
                    value={method}
                    onChange={(e) => {
                      setMethod(e.target.value);
                      handleLiveUpdate({ method: e.target.value });
                    }}
                    placeholder="예: 홈페이지, 유선, 포털 등"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="input-group">
                  <label><Users size={14} /> 담당 팀</label>
                  <input
                    type="text"
                    value={team}
                    onChange={(e) => {
                      setTeam(e.target.value);
                      handleLiveUpdate({ team: e.target.value });
                    }}
                    placeholder="예: 영업팀, 개발1팀 등"
                  />
                </div>

                <div className="input-group">
                  <label><User size={14} /> 담당자</label>
                  <input
                    type="text"
                    value={person}
                    onChange={(e) => {
                      setPerson(e.target.value);
                      handleLiveUpdate({ person: e.target.value });
                    }}
                    placeholder="예: 홍길동"
                  />
                </div>
              </>
            )}

            <div className="input-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isStar}
                  onChange={(e) => {
                    setIsStar(e.target.checked);
                    handleLiveUpdate({ isStar: e.target.checked });
                  }}
                />
                <Star size={14} fill={isStar ? "var(--star-color)" : "none"} color={isStar ? "var(--star-color)" : "currentColor"} />
                고객 (학생, 학부모) 접점 여부
              </label>
            </div>

            <div className="panel-actions">
              <button className="delete-btn" onClick={() => onDelete(selectedElement.id)}>
                <Trash2 size={18} /> 삭제
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="input-group">
              <label><Share2 size={14} /> 전달 수단</label>
              <div className="method-grid">
                {methods.map((m) => (
                  <button
                    key={m.value}
                    className={`method-chip ${edgeMethod === m.value ? 'active' : ''}`}
                    onClick={() => {
                      setEdgeMethod(m.value);
                      handleLiveUpdate({ method: m.value });
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label><Zap size={14} /> 자동화 여부</label>
              <div className="automation-group">
                {automationTypes.map((t) => (
                  <button
                    key={t.value}
                    className={`automation-chip ${automation === t.value ? 'active' : ''} ${t.value}`}
                    onClick={() => {
                      setAutomation(t.value);
                      handleLiveUpdate({ automation: t.value });
                    }}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="panel-actions">
              <button className="delete-btn" onClick={() => onDelete(selectedElement.id)}>
                <Trash2 size={18} /> 연결 삭제
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx="true">{`
        .properties-panel {
          position: absolute;
          right: 20px;
          top: 80px;
          width: 320px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
          z-index: 20;
          display: flex;
          flex-direction: column;
        }
        .panel-header {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .status-badge {
          font-size: 0.75rem;
          color: #10b981;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
        }
        .pulse {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        .close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .panel-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .checkbox-group {
          margin: 10px 0;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          color: white;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .input-group label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .input-group input, .input-group textarea {
          background: #1e293b;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 10px;
          color: white;
          font-size: 0.95rem;
          outline: none;
        }
        .method-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .method-chip {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .method-chip.active {
          background: var(--accent-primary);
          color: var(--bg-main);
          border-color: var(--accent-primary);
          font-weight: 600;
        }
        .automation-group {
          display: flex;
          gap: 8px;
        }
        .automation-chip {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 4px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: 0;
        }
        .automation-chip.active.자동 { background: #3b82f6; color: white; border-color: #3b82f6; font-weight: 600; }
        .automation-chip.active.반자동 { background: #fbbf24; color: white; border-color: #fbbf24; font-weight: 600; }
        .automation-chip.active.수동 { background: #ef4444; color: white; border-color: #ef4444; font-weight: 600; }
        
        .panel-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        .save-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--accent-primary);
          color: var(--bg-main);
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .delete-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: transparent;
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 10px;
          border-radius: 8px;
          cursor: pointer;
        }
      `}</style>
    </motion.div>
  );
};

export default PropertiesPanel;
