import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Users, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

const Login = ({ onLoginSuccess, initialUser = null, isEditMode = false, onCancel = null }) => {
  const [isLogin, setIsLogin] = useState(!isEditMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states 초기값 (EditMode면 유저 정보 우선, 아니면 로컬스토리지)
  const [userId, setUserId] = useState(initialUser?.userId || localStorage.getItem('savedUserId') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('savedUserId'));
  
  // Signup only states
  const [team, setTeam] = useState(initialUser?.team || '');
  const [name, setName] = useState(initialUser?.name || '');
  const [email, setEmail] = useState('');
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [teams, setTeams] = useState([]);
  const [fetchingTeams, setFetchingTeams] = useState(false);

  useEffect(() => {
    if (!isLogin) {
      fetchTeams();
    }
  }, [isLogin]);

  const fetchTeams = async () => {
    setFetchingTeams(true);
    try {
      const response = await fetch('/api/getTeams');
      const result = await response.json();
      if (result.status === 'success') {
        setTeams(result.data);
      } else {
        setError(`팀 목록 로드 실패: ${result.message || '알 수 없는 오류'}`);
      }
    } catch (err) {
      setError(`서버 연결 실패: ${err.message}`);
    } finally {
      setFetchingTeams(false);
    }
  };

  // Backend API endpoints
  const SIGNUP_URL = '/api/signup';
  const CHECK_ID_URL = '/api/checkId';

  const checkIdDuplication = async () => {
    if (!userId) {
      setError('아이디를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(CHECK_ID_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (result.result === 'success') {
        setIsIdChecked(true);
        setSuccess('사용 가능한 아이디입니다.');
        setError('');
      } else {
        setError(result.message || '이미 사용 중인 아이디입니다.');
        setIsIdChecked(false);
      }
    } catch (err) {
      console.error('Check ID Error:', err);
      setError('아이디 중복 확인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = (e) => {
    e.preventDefault();
    if (!userId) {
      setError('아이디를 입력해 주세요.');
      return;
    }
    setLoading(true);
    
    if (!isLogin) {
      if (!isIdChecked) {
        setError('아이디 중복 확인을 해주세요.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }

      // Actual Signup
      const registerUser = async () => {
        try {
          const response = await fetch(SIGNUP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ team, name, userId, password, email }),
          });
          const result = await response.json();
          if (result.status === 'success') {
            onLoginSuccess({ userId, name, team });
          } else {
            setError(`회원가입 실패: ${result.message}`);
          }
        } catch (err) {
          setError(`회원가입 중 오류가 발생했습니다: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };
      registerUser();
    } else {
      // Actual Login implementation
      const loginUser = async () => {
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, password }),
          });
          const result = await response.json();
          if (result.status === 'success') {
            if (rememberMe) {
              localStorage.setItem('savedUserId', userId);
            } else {
              localStorage.removeItem('savedUserId');
            }
            onLoginSuccess(result.data);
          } else {
            setError(result.message || '로그인 실패');
          }
        } catch (err) {
          setError(`로그인 중 오류가 발생했습니다: ${err.message}`);
        } finally {
          setLoading(false);
        }
      };
      loginUser();
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setIsIdChecked(false);
  };

  return (
    <div className="login-wrapper">
      <motion.div className="login-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="login-header">
          <div className="logo-section">
            <span className="logo-sparkle">Smarter, Faster, Closer</span>
            <h1>에이닷 워크플로우</h1>
          </div>
          <p>
            {isEditMode ? '회원 정보 수정' : (isLogin ? '업무 시스템에 로그인하세요' : '새로운 계정을 생성하세요')}
          </p>
        </div>

        <form onSubmit={handleAuth} className="login-form">
          {!isLogin && (
            <div className="input-row">
              <div className="input-group">
                <label><Users size={16} /> 팀명</label>
                <select value={team} onChange={(e) => setTeam(e.target.value)} required disabled={fetchingTeams}>
                  <option value="">팀을 선택하세요</option>
                  {teams.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                  {fetchingTeams && <option disabled>불러오는 중...</option>}
                </select>
              </div>
              <div className="input-group">
                <label><User size={16} /> 이름</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" required />
              </div>
            </div>
          )}

          <div className="input-group">
            <label><User size={16} /> 아이디</label>
            <div className="input-with-button">
              <input 
                type="text" 
                value={userId} 
                onChange={(e) => { setUserId(e.target.value); setIsIdChecked(false); }} 
                placeholder="아이디" 
                required 
              />
              {!isLogin && (
                <button type="button" className={`check-btn ${isIdChecked ? 'checked' : ''}`} onClick={checkIdDuplication} disabled={loading || isIdChecked}>
                  {isIdChecked ? '확인됨' : '중복 확인'}
                </button>
              )}
            </div>
          </div>

          <div className="input-group">
            <label><Lock size={16} /> 비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" required />
          </div>

          {/* 로그인 정보 저장 체크박스 섹션 */}
          {isLogin && (
            <div className="auth-options">
              <label className="remember-me-label">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-text">로그인 정보 저장</span>
              </label>
            </div>
          )}

          {!isLogin && (
            <>
              <div className="input-group">
                <label><Lock size={16} /> 비밀번호 확인</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호 확인" required />
              </div>
              <div className="input-group">
                <label><AlertCircle size={16} /> 사내 이메일 주소</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@sk.com" required />
              </div>
            </>
          )}

          <AnimatePresence>
            {error && <motion.div className="error-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><AlertCircle size={14} /> {error}</motion.div>}
            {success && <motion.div className="success-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><CheckCircle2 size={14} /> {success}</motion.div>}
          </AnimatePresence>

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? <div className="spinner"></div> : (isEditMode ? '수정 완료하기' : (isLogin ? '로그인하기' : '회원가입하기'))}
          </button>
        </form>

        <div className="auth-footer">
          {isEditMode ? (
            <button onClick={onCancel}>수정 취소하고 돌아가기</button>
          ) : (
            <button onClick={toggleAuthMode}>
              {isLogin ? '처음이신가요? 회원가입' : '이미 계정이 있나요? 로그인'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
