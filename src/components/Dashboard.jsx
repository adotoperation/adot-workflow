import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  Trash2, 
  ExternalLink, 
  Clock, 
  Search,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';

const Dashboard = ({ user, onCreateNew, onOpenWorkflow, onLogout, onEditProfile }) => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    fetchWorkflows();
  }, [user]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/loadWorkflow?userId=${user.userId}`);
      const result = await response.json();
      if (result.status === 'success') {
        // Backend now returns a list of objects: [{ jobName, updatedAt, workflowId, flowData }, ...]
        const list = result.data.map((wf) => ({
          id: wf.workflowId,
          name: wf.jobName,
          updatedAt: wf.updatedAt,
          nodeCount: wf.flowData ? JSON.parse(wf.flowData).nodes.length : 0
        })).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setWorkflows(list);
      }
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkflows = workflows.filter(wf => 
    wf.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteWorkflow = async (e, workflowId, workflowName) => {
    e.stopPropagation(); // Card click event prevent
    if (!window.confirm(`'${workflowName}' 워크플로우를 정말로 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch('/api/deleteWorkflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, workflowId })
      });
      const result = await response.json();
      if (result.status === 'success') {
        alert('삭제되었습니다.');
        fetchWorkflows(); // Refresh list
      } else {
        alert(`삭제 실패: ${result.message}`);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('삭제 도중 오류가 발생했습니다.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '알 수 없음';
    return dateStr; // Now using YYYY-MM-DD format from backend
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="db-brand">
          <span className="db-slogan">Smarter, Faster, Closer</span>
          <h1>내 워크플로우 대시보드</h1>
        </div>
        
        <div className="db-user-info">
          <div className="user-details">
            <span className="user-team">{user.team}</span>
            <span className="user-name">{user.name}님</span>
          </div>
          <button className="edit-profile-btn" onClick={onEditProfile}>회원정보수정</button>
          <button className="logout-btn" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="content-toolbar">
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="워크플로우 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="view-controls">
            <button 
              className={viewMode === 'grid' ? 'active' : ''} 
              onClick={() => setViewMode('grid')}
            ><LayoutGrid size={18} /></button>
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
            ><ListIcon size={18} /></button>
          </div>
        </div>

        <div className={`workflow-${viewMode}`}>
          <motion.div 
            className="create-card"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreateNew}
          >
            <div className="plus-icon-circle">
              <Plus size={32} />
            </div>
            <h3>새 워크플로우 만들기</h3>
            <p>빈 캔버스에서 새로운 업무 흐름을 설계하세요</p>
          </motion.div>

          {loading ? (
             <div className="db-loading">불러오는 중...</div>
          ) : (
            filteredWorkflows.map((wf, idx) => (
              <motion.div 
                key={wf.id}
                className="workflow-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="card-top">
                  <div className="workflow-icon">
                    <FileText size={24} />
                  </div>
                  <div className="workflow-meta">
                    <span className="node-badge">{wf.nodeCount} Nodes</span>
                  </div>
                </div>
                
                <div className="card-info">
                  <h3>{wf.name}</h3>
                  <div className="updated-at">
                    <Clock size={14} /> {formatDate(wf.updatedAt)}
                  </div>
                </div>

                <div className="card-actions">
                  <button className="open-btn" onClick={() => onOpenWorkflow(wf.id)}>
                    <ExternalLink size={16} /> 열기
                  </button>
                  <button className="delete-btn" onClick={(e) => handleDeleteWorkflow(e, wf.id, wf.name)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      <style jsx="true">{`
        .dashboard-container {
          width: 100%;
          min-height: 100vh;
          background: #020617;
          color: #fff;
          padding: 40px 60px;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 60px;
        }
        .db-slogan {
          color: var(--accent);
          font-weight: 700;
          letter-spacing: 0.1em;
          font-size: 0.9rem;
        }
        .db-brand h1 {
          font-size: 2.5rem;
          font-weight: 900;
          margin-top: 5px;
        }
        .db-user-info {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .user-details {
          text-align: right;
        }
        .user-team {
          display: block;
          font-size: 0.85rem;
          color: var(--text-dim);
        }
        .user-name {
          font-weight: 700;
          font-size: 1.1rem;
        }
        .logout-btn, .edit-profile-btn {
          border: 1px solid rgba(255,255,255,0.1);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: 0.3s;
        }
        .logout-btn {
          background: rgba(255,255,255,0.05);
          color: #ff4d4d;
        }
        .edit-profile-btn {
          background: rgba(56, 189, 248, 0.1);
          color: var(--accent);
          border-color: rgba(56, 189, 248, 0.2);
        }
        .edit-profile-btn:hover {
          background: var(--accent);
          color: #000;
        }
        
        .content-toolbar {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .search-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          padding: 10px 20px;
          border-radius: 12px;
          width: 400px;
        }
        .search-bar input {
          background: transparent;
          border: none;
          color: #fff;
          outline: none;
          width: 100%;
        }
        .view-controls {
          display: flex;
          gap: 8px;
        }
        .view-controls button {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          color: var(--text-dim);
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .view-controls button.active {
          background: var(--accent);
          color: #000;
          border-color: var(--accent);
        }

        .workflow-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        .create-card {
          background: rgba(56, 189, 248, 0.05);
          border: 2px dashed rgba(56, 189, 248, 0.2);
          border-radius: 20px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: 0.3s;
        }
        .create-card:hover {
          background: rgba(56, 189, 248, 0.1);
          border-color: var(--accent);
        }
        .plus-icon-circle {
          width: 64px;
          height: 64px;
          background: var(--accent);
          color: #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(56, 189, 248, 0.4);
        }
        .create-card h3 { font-size: 1.2rem; font-weight: 800; margin-bottom: 8px; }
        .create-card p { font-size: 0.9rem; color: var(--text-dim); }

        .workflow-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          backdrop-filter: blur(10px);
        }
        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        .workflow-icon {
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
        }
        .node-badge {
          background: rgba(255,255,255,0.05);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .card-info h3 {
          font-size: 1.3rem;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .updated-at {
          font-size: 0.85rem;
          color: var(--text-dim);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .card-actions {
          margin-top: 24px;
          display: flex;
          gap: 10px;
        }
        .open-btn {
          flex: 1;
          background: var(--accent);
          color: #000;
          border: none;
          padding: 10px;
          border-radius: 8px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .delete-btn {
          background: rgba(255, 77, 77, 0.1);
          border: 1px solid rgba(255, 77, 77, 0.2);
          color: #ff4d4d;
          width: 40px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
