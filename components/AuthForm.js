import React, { useState } from 'react';

/**
 * 사용자 인증 폼 컴포넌트
 */
const AuthForm = () => {
  // 상태 관리
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  
  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 입력값 검증
    if (!email) {
      setError('이메일을 입력해주세요.');
      return;
    }
    
    if (isSignUp && !username) {
      setError('사용자 이름을 입력해주세요.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      
      // API 요청
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          username: isSignUp ? username : undefined,
          action: isSignUp ? 'signup' : 'signin',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '인증 처리 중 오류가 발생했습니다.');
      }
      
      // 성공 메시지 표시
      setMessage(data.message);
      
      // 폼 초기화
      if (isSignUp) {
        setEmail('');
        setUsername('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 모드 전환 핸들러
  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setMessage(null);
  };
  
  return (
    <div className="auth-form">
      <h3 className="form-title">{isSignUp ? '회원가입' : '로그인'}</h3>
      
      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소를 입력하세요"
            disabled={loading}
          />
        </div>
        
        {isSignUp && (
          <div className="form-group">
            <label htmlFor="username">사용자 이름</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="사용자 이름을 입력하세요"
              disabled={loading}
            />
          </div>
        )}
        
        <div className="form-actions">
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? '처리 중...' : isSignUp ? '가입하기' : '로그인'}
          </button>
          
          <button type="button" className="toggle-button" onClick={toggleMode} disabled={loading}>
            {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 가입하기'}
          </button>
        </div>
      </form>
      
      <style jsx>{`
        .auth-form {
          width: 100%;
          max-width: 400px;
          padding: 1.5rem;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          background-color: white;
        }
        
        .form-title {
          margin-top: 0;
          margin-bottom: 1.5rem;
          text-align: center;
          font-size: 1.5rem;
        }
        
        .message {
          padding: 0.75rem;
          margin-bottom: 1rem;
          border-radius: 4px;
        }
        
        .success {
          background-color: #e6f7e6;
          color: #2e7d32;
        }
        
        .error {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        
        input:focus {
          outline: none;
          border-color: #0070f3;
          box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.2);
        }
        
        .form-actions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        
        .submit-button {
          padding: 0.75rem;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
        }
        
        .submit-button:hover:not(:disabled) {
          background-color: #0051a2;
        }
        
        .toggle-button {
          background: none;
          border: none;
          color: #0070f3;
          cursor: pointer;
          font-size: 0.9rem;
          text-align: center;
          padding: 0;
        }
        
        .toggle-button:hover:not(:disabled) {
          text-decoration: underline;
        }
        
        button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default AuthForm; 