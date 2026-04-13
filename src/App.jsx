import React, { useState, useRef } from 'react';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useViewport,
  useReactFlow,
  useOnSelectionChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Save, Settings, Pencil, LogOut, UserRound } from 'lucide-react';

// 복구된 프리미엄 컴포넌트들 임포트
import Sidebar from './components/Sidebar';
import { TriggerNode, ProcessNode, DecisionNode, OutputNode } from './components/CustomNodes';
import PropertiesPanel from './components/PropertiesPanel';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const SCRIPT_URL = '/api/saveWorkflow';

const VIEW_LOGIN = 'LOGIN';
const VIEW_DASHBOARD = 'DASHBOARD';
const VIEW_EDITOR = 'EDITOR';

// --- 오리지널 황금기 영역 표시 시스템 ---
const LaneSystem = () => {
  const { x, y, zoom } = useViewport();
  return (
    <div className="lanes-container" style={{ 
      width: '3000px', height: '3000px',
      transform: `translate(${x}px, ${y}px) scale(${zoom})`, transformOrigin: '0 0'
    }}>
      <div className="lanes-inner">
        <div className="lane lane-input"><span className="lane-label">INPUT</span></div>
        <div className="lane lane-processing"><span className="lane-label">PROCESSING</span></div>
        <div className="lane lane-output"><span className="lane-label">OUTPUT</span></div>
      </div>
    </div>
  );
};

// --- 상태 표시기 (줌 및 좌표) ---
const StatusIndicators = ({ clickedPos }) => {
  return (
    <div className="status-indicators">
      {clickedPos && (
        <div className="status-pill highlight">CLICKED: {Math.round(clickedPos.x)}, {Math.round(clickedPos.y)}</div>
      )}
    </div>
  );
};

// --- 클릭 좌표 탐지기 (ReactFlow 내부에서 동작) ---
const ClickTracer = ({ setClickedPos }) => {
  const { screenToFlowPosition } = useReactFlow();
  return (
    <div 
      style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 0 }} 
      onClick={(event) => {
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        setClickedPos(position);
      }}
    />
  );
};

const nodeTypes = {
  node_trigger: TriggerNode,
  node_process: ProcessNode,
  node_decision: DecisionNode,
  node_output: OutputNode,
};

const WorkflowAppGolden = ({ user, initialData, onBack }) => {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, setViewport } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || []);
  const [workflowName, setWorkflowName] = useState(initialData?.name || '(제목없음)');
  const [selectedElement, setSelectedElement] = useState(null);
  const [elementType, setElementType] = useState(null);
  const [clickedPos, setClickedPos] = useState(null);

  const onConnect = (params) => {
    // 기본값: 수동 / 정해진 것 없음
    const defaultData = { method: '정해진 것 없음', automation: '수동' };
    const defaultColor = '#ef4444'; // 수동 (Red)
    
    setEdges((eds) => addEdge({ 
      ...params, 
      label: defaultData.method,
      data: defaultData,
      animated: true, 
      style: { stroke: defaultColor, strokeWidth: 4 },
      labelStyle: { fill: '#fff', fontWeight: 800, fontSize: 24 },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 4,
      labelBgStyle: { fill: 'rgba(15, 23, 42, 0.8)', fillOpacity: 0.8 },
    }, eds));
  };

  return (
    <div className="workflow-master-container">
      <header className="app-top-header">
        <div className="header-left-part">
          {/* 좌측은 대칭을 위해 비워둠 */}
        </div>

        <div className="header-center-part">
          <div className="header-title-box">
            <div className="title-edit-container">
              <Pencil size={18} className="edit-icon" />
              <input 
                type="text" 
                value={workflowName} 
                onChange={(e) => setWorkflowName(e.target.value)} 
                spellCheck={false} 
                className="header-workflow-input"
                placeholder="업무이름을 입력해주세요."
              />
            </div>
          </div>
        </div>

        <div className="header-right-part">
          <div className="user-profile-section">
            <UserRound size={16} className="user-icon" />
            <span className="user-info-text">
              {user.team} <strong>{user.name}</strong>
            </span>
          </div>
          
          <div className="vertical-divider"></div>

          <button className="btn-header-edit-profile" onClick={onBack}>대시보드로</button>
          <button className="btn-header-save" onClick={async () => {
            try {
              const flowData = JSON.stringify({ nodes, edges });
              const response = await fetch(SCRIPT_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  action: 'saveWorkflow', 
                  userId: user.userId, 
                  workflowId: initialData?.workflowId || 'WF-' + Date.now(),
                  jobName: workflowName, 
                  flowData 
                }) 
              });
              
              const result = await response.json();
              if (response.ok && result.status === 'success') {
                alert('성공적으로 저장되었습니다!');
              } else {
                alert(`저장 실패: ${result.message || '알 수 없는 오류가 발생했습니다.'}`);
              }
            } catch (err) { 
              alert(`서버 연결 오류: ${err.message}`); 
            }
          }}><Save size={16} /> 저장하기</button>
          <button className="btn-header-primary" onClick={() => {
            if (reactFlowWrapper.current) {
              toPng(reactFlowWrapper.current, { backgroundColor: '#020617' }).then((url) => {
                const a = document.createElement('a'); a.download = `${workflowName}.png`; a.href = url; a.click();
              });
            }
          }}><Download size={16} /> 이미지 저장</button>
        </div>
      </header>

      <div className="workflow-main-body">
        <Sidebar onAddNode={(type) => {
          const newNode = {
            id: `node_${Date.now()}`,
            type,
            position: { x: 850, y: 350 },
            data: { label: '내용을 입력하세요', team: user.team, person: user.name },
          };
          setNodes((nds) => [...nds, newNode]);
        }} />
        <div className="flow-canvas-area" ref={reactFlowWrapper}>
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange} 
            onConnect={onConnect} 
            onNodeClick={(e, n) => { setSelectedElement(n); setElementType('node'); }}
            onEdgeClick={(e, edge) => { setSelectedElement(edge); setElementType('edge'); }}
            onPaneClick={() => { setSelectedElement(null); setElementType(null); setClickedPos(null); }}
            nodeTypes={nodeTypes} 
            defaultViewport={{ x: 57, y: -14, zoom: 0.5 }}
            minZoom={0.1}
            maxZoom={4}
            colorMode="dark"
          >
            <ClickTracer setClickedPos={setClickedPos} />
            <LaneSystem />
            <StatusIndicators clickedPos={clickedPos} />
            <Background color="#1e293b" variant="dots" gap={20} />
            <Controls />
            <MiniMap 
              style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '16px' }} 
              maskColor="rgba(0,0,0,0.6)" 
              position="bottom-right"
              nodeColor={(n) => {
                if (n.type === 'node_trigger') return '#fbbf24';
                if (n.type === 'node_process') return '#3b82f6';
                if (n.type === 'node_decision') return '#a855f7';
                return '#ef4444';
              }} 
            />
          </ReactFlow>
          
          <AnimatePresence>
            {selectedElement && (
              <PropertiesPanel 
                selectedElement={selectedElement} 
                type={elementType} 
                onUpdate={(id, newData) => {
                  if (elementType === 'node') {
                    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...newData } } : n));
                  } else {
                    setEdges((eds) => eds.map((e) => {
                      if (e.id === id) {
                        const { label, style, ...restData } = newData;
                        return { 
                          ...e, 
                          ...(label ? { label } : {}),
                          ...(style ? { style } : {}),
                          data: { ...e.data, ...restData } 
                        };
                      }
                      return e;
                    }));
                  }
                }} 
                onDelete={(id) => {
                  if (elementType === 'node') {
                    setNodes((nds) => nds.filter((n) => n.id !== id));
                  } else {
                    setEdges((eds) => eds.filter((e) => e.id !== id));
                  }
                  setSelectedElement(null);
                }} 
                onClose={() => setSelectedElement(null)} 
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const getInitialUser = () => {
    try {
      const savedUser = localStorage.getItem('adot_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  };

  const initialUser = getInitialUser();
  const [user, setUser] = useState(initialUser);
  const [view, setView] = useState(initialUser ? VIEW_DASHBOARD : VIEW_LOGIN);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('adot_user', JSON.stringify(userData)); // 브라우저에 저장
    setView(VIEW_DASHBOARD);
    setIsEditingProfile(false);
  };

  const handleCreateNew = () => {
    const newId = 'WF-' + Date.now();
    setEditingWorkflow({ name: '(제목없음)', workflowId: newId, nodes: [], edges: [] });
    setView(VIEW_EDITOR);
  };

  const handleOpenWorkflow = async (workflowId) => {
    try {
      const response = await fetch(`/api/loadWorkflow?userId=${user.userId}&workflowId=${workflowId}`);
      const result = await response.json();
      if (result.status === 'success') {
        const flowData = JSON.parse(result.data.flowData);
        setEditingWorkflow({ 
          name: result.data.jobName, 
          workflowId: result.data.workflowId, 
          ...flowData 
        });
        setView(VIEW_EDITOR);
      }
    } catch (err) {
      console.error('불러오기 실패:', err);
      alert('불러오기 실패');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('adot_user'); // 브라우저 저장 정보 삭제
    setView(VIEW_LOGIN);
    setIsEditingProfile(false);
  };

  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setView(VIEW_LOGIN);
  };

  return (
    <ReactFlowProvider>
      <div className="app-root-container">
        <AnimatePresence mode="wait">
          {view === VIEW_LOGIN && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Login 
                onLoginSuccess={handleLoginSuccess} 
                initialUser={user} 
                isEditMode={isEditingProfile} 
                onCancel={() => {
                  setIsEditingProfile(false);
                  setView(VIEW_DASHBOARD);
                }}
              />
            </motion.div>
          )}

          {view === VIEW_DASHBOARD && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard 
                user={user} 
                onCreateNew={handleCreateNew} 
                onOpenWorkflow={handleOpenWorkflow}
                onLogout={handleLogout}
                onEditProfile={handleEditProfile}
              />
            </motion.div>
          )}

          {view === VIEW_EDITOR && (
            <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ height: '100%' }}>
              <WorkflowAppGolden 
                user={user} 
                initialData={editingWorkflow} 
                onBack={() => setView(VIEW_DASHBOARD)} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ReactFlowProvider>
  );
}
