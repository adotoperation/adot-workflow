import React from 'react';
import { Play, ClipboardList, CheckCircle2, Info, GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = ({ onAddNode }) => {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeTypes = [
    { type: 'node_trigger', label: '업무 트리거', icon: <Play size={20} />, color: 'var(--trigger-color)', description: '업무를 시작하게 하는 요인' },
    { type: 'node_process', label: '일반 업무 과정', icon: <ClipboardList size={20} />, color: 'var(--process-color)', description: '심플한 단일 진행 단계' },
    { type: 'node_decision', label: '업무 분기점', icon: <GitBranch size={20} />, color: 'var(--decision-color)', description: 'YES/NO 흐름이 나뉘는 지점' },
    { type: 'node_output', label: '최종 결과물', icon: <CheckCircle2 size={20} />, color: 'var(--output-color)', description: '업무 완료 후의 아웃풋' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="slogan-text">Smarter, Faster, Closer</div>
        <h2 className="sidebar-title">에이닷 워크플로우</h2>
        <p className="sidebar-desc">클릭해서 캔버스에 추가하세요</p>
      </div>
      
      <div className="node-list">
        {nodeTypes.map((node) => (
          <motion.div
            key={node.type}
            className="dnd-node"
            onDragStart={(event) => onDragStart(event, node.type)}
            onClick={() => onAddNode(node.type)}
            draggable
            whileHover={{ scale: 1.02, borderColor: node.color }}
            whileTap={{ scale: 0.98 }}
            style={{ '--node-accent': node.color }}
          >
            <div className="dnd-icon-wrapper">
              {node.icon}
            </div>
            <div className="dnd-info">
              <span className="dnd-label">{node.label}</span>
              <span className="dnd-desc">{node.description}</span>
            </div>
          </motion.div>
        ))}
        
        {/* 설명 문구를 블록 바로 아래로 이동 */}
        <div className="tip-card" style={{ marginTop: '8px' }}>
          <Info size={16} />
          <p>노드를 클릭하여 업무 내용과 담당자를 수정할 수 있습니다.</p>
        </div>
      </div>

      <style jsx="true">{`
        .sidebar { 
          width: 320px; 
          min-width: 320px; 
          height: 100%; 
          background: var(--bg-sidebar); 
          border-right: 1px solid var(--border); 
          padding: 24px; 
          display: flex; 
          flex-direction: column; 
          gap: 20px; 
          overflow-y: auto; 
          flex-shrink: 0;
        }
        .sidebar-header {
          margin-bottom: 20px;
        }
        .slogan-text {
          font-size: 1.0rem;
          color: var(--accent);
          font-weight: 700;
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }
        .sidebar-title {
          font-size: 2.2rem;
          font-weight: 900;
          line-height: 1.2;
          margin-bottom: 4px;
          background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .sidebar-desc {
          font-size: 1.1rem;
          color: var(--text-dim);
          font-weight: 500;
        }
        .node-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .dnd-node {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dnd-node:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--node-accent);
        }
        .dnd-icon-wrapper {
          color: var(--node-accent);
          background: rgba(var(--node-accent), 0.1);
          padding: 10px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dnd-info {
          display: flex;
          flex-direction: column;
        }
        .dnd-label {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .dnd-desc {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .tip-card {
          padding: 12px;
          background: rgba(56, 189, 248, 0.05);
          border: 1px solid rgba(56, 189, 248, 0.1);
          border-radius: 8px;
          display: flex;
          gap: 10px;
          color: var(--accent-primary);
          font-size: 0.75rem;
          line-height: 1.4;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
