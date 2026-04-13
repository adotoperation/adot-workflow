import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, ClipboardList, CheckCircle2, User, GitBranch, Users, Star, Smartphone } from 'lucide-react';

const BaseNode = ({ label, person, team, applicant, method, isStar, type, children, selected, showMeta = true, isTrigger = false }) => {
  const icons = {
    node_trigger: <Play size={18} />,
    node_process: <ClipboardList size={18} />,
    node_decision: <GitBranch size={18} />,
    node_output: <CheckCircle2 size={18} />,
  };

  const typeLabel = {
    node_trigger: 'TRIGGER',
    node_process: 'PROCESS',
    node_decision: 'DECISION',
    node_output: 'OUTPUT',
  };

  return (
    <div className={`node-container ${type} ${selected ? 'selected' : ''}`}>
      {isStar && (
        <div className="star-badge">
          <Star size={14} fill="currentColor" />
        </div>
      )}
      <div className="node-body">
        <div className="node-text">{label || '내용을 입력하세요'}</div>
        
        {isTrigger && (
          <div className="node-meta trigger-meta">
            {applicant && (
              <div className="node-team">
                <User size={24} />
                <span>{applicant}</span>
              </div>
            )}
            {method && (
              <div className="node-person">
                <Smartphone size={24} />
                <span>{method}</span>
              </div>
            )}
          </div>
        )}

        {showMeta && !isTrigger && (
          <div className="node-meta">
            {team && (
              <div className="node-team">
                <Users size={24} />
                <span>{team}</span>
              </div>
            )}
            {person && (
              <div className="node-person">
                <User size={24} />
                <span>{person}</span>
              </div>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export const TriggerNode = memo(({ data, selected }) => (
  <BaseNode 
    type="node_trigger" 
    label={data.label} 
    applicant={data.applicant}
    method={data.method}
    isStar={data.isStar} 
    selected={selected}
    isTrigger={true}
    showMeta={false}
  >
    <Handle type="source" position={Position.Right} id="right" style={{ width: '16px', height: '16px', right: '-8px', background: 'var(--trigger-color)' }} />
  </BaseNode>
));

export const ProcessNode = memo(({ data, selected }) => (
  <BaseNode type="node_process" label={data.label} team={data.team} person={data.person} isStar={data.isStar} selected={selected}>
    <Handle type="target" position={Position.Left} id="target-left" style={{ width: '16px', height: '16px', left: '-8px', background: 'var(--process-color)' }} />
    <Handle type="source" position={Position.Right} id="right" style={{ width: '16px', height: '16px', right: '-8px', background: 'var(--process-color)' }} />
  </BaseNode>
));

export const DecisionNode = memo(({ data, selected }) => (
  <BaseNode type="node_decision" label={data.label} team={data.team} person={data.person} isStar={data.isStar} selected={selected}>
    <Handle type="target" position={Position.Left} id="target-left" style={{ width: '16px', height: '16px', left: '-8px', background: 'var(--decision-color)' }} />
    <Handle type="source" position={Position.Right} id="yes" style={{ width: '16px', height: '16px', right: '-8px', top: '30%', background: 'var(--decision-color)' }} />
    <Handle type="source" position={Position.Right} id="no" style={{ width: '16px', height: '16px', right: '-8px', top: '70%', background: 'var(--decision-color)' }} />
    <div className="branch-label top">YES</div>
    <div className="branch-label bottom">NO</div>
    <style jsx="true">{`
      .branch-label {
        position: absolute;
        right: -50px;
        font-size: 14px;
        font-weight: 800;
        color: var(--decision-color);
        pointer-events: none;
      }
      .branch-label.top { top: 25%; }
      .branch-label.bottom { top: 65%; }
    `}</style>
  </BaseNode>
));

export const OutputNode = memo(({ data, selected }) => (
  <BaseNode type="node_output" label={data.label} team={data.team} person={data.person} isStar={data.isStar} selected={selected}>
    <Handle type="target" position={Position.Left} id="target-left" style={{ width: '16px', height: '16px', left: '-8px', background: 'var(--output-color)' }} />
  </BaseNode>
));
