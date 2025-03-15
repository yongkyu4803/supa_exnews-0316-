import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [apiSettings, setApiSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 로그인 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    
    if (token && adminData) {
      setIsLoggedIn(true);
      setAdmin(JSON.parse(adminData));
      fetchData(token);
    } else {
      setLoading(false);
    }
  }, []);
  
  // API 설정 및 사용자 데이터 가져오기
  const fetchData = async (token) => {
    try {
      setLoading(true);
      setError(null);
      
      // API 설정 가져오기
      const apiSettingsResponse = await fetch('/api/admin/api-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!apiSettingsResponse.ok) {
        throw new Error('API 설정을 가져오는 중 오류가 발생했습니다.');
      }
      
      const apiSettingsData = await apiSettingsResponse.json();
      setApiSettings(apiSettingsData.settings);
      
      // 사용자 목록 가져오기
      const usersResponse = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!usersResponse.ok) {
        throw new Error('사용자 목록을 가져오는 중 오류가 발생했습니다.');
      }
      
      const usersData = await usersResponse.json();
      setUsers(usersData.users);
    } catch (err) {
      console.error('데이터 로드 중 오류 발생:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 로그인 처리
  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const email = e.target.email.value;
      const password = e.target.password.value;
      
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '로그인 중 오류가 발생했습니다.');
      }
      
      // 로그인 성공
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminData', JSON.stringify(data.admin));
      
      setIsLoggedIn(true);
      setAdmin(data.admin);
      
      // 데이터 가져오기
      fetchData(data.token);
    } catch (err) {
      console.error('로그인 중 오류 발생:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 로그아웃 처리
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setIsLoggedIn(false);
    setAdmin(null);
    setApiSettings(null);
    setUsers([]);
  };
  
  // API 활성화/비활성화 토글
  const toggleApiStatus = async (apiName, currentStatus) => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('/api/admin/api-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          apiName,
          isActive: !currentStatus
        })
      });
      
      if (!response.ok) {
        throw new Error('API 설정 업데이트 중 오류가 발생했습니다.');
      }
      
      // 데이터 다시 가져오기
      fetchData(token);
    } catch (err) {
      console.error('API 상태 변경 중 오류 발생:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 수동으로 기사 수집 실행
  const runNewsCollection = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/cron/collect-news', {
        headers: {
          'x-api-key': '32320909' // .env.local에 설정된 CRON_API_KEY 값
        }
      });
      
      if (!response.ok) {
        throw new Error('기사 수집 중 오류가 발생했습니다.');
      }
      
      const result = await response.json();
      
      alert(`기사 수집 완료: ${result.count}개의 기사가 수집되었습니다.`);
    } catch (err) {
      console.error('기사 수집 중 오류 발생:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // 로그인 폼 렌더링
  const renderLoginForm = () => (
    <div className="login-form">
      <h2>관리자 로그인</h2>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">이메일</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="관리자 이메일"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">비밀번호</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            placeholder="비밀번호"
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
  
  // 대시보드 렌더링
  const renderDashboard = () => (
    <div className="dashboard">
      <div className="header">
        <h2>관리자 대시보드</h2>
        <div className="user-info">
          <span>{admin?.email}</span>
          <button onClick={handleLogout}>로그아웃</button>
        </div>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <div className="dashboard-content">
        <div className="card">
          <h3>API 설정</h3>
          {loading ? (
            <p>로딩 중...</p>
          ) : apiSettings && apiSettings.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>API 이름</th>
                  <th>상태</th>
                  <th>마지막 실행</th>
                  <th>실행 간격(초)</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {apiSettings.map(setting => (
                  <tr key={setting.id}>
                    <td>{setting.api_name}</td>
                    <td>
                      <span className={`status ${setting.is_active ? 'active' : 'inactive'}`}>
                        {setting.is_active ? '활성화' : '비활성화'}
                      </span>
                    </td>
                    <td>{setting.last_run ? new Date(setting.last_run).toLocaleString() : '없음'}</td>
                    <td>{setting.run_interval}</td>
                    <td>
                      <button
                        onClick={() => toggleApiStatus(setting.api_name, setting.is_active)}
                        className={setting.is_active ? 'btn-danger' : 'btn-success'}
                      >
                        {setting.is_active ? '비활성화' : '활성화'}
                      </button>
                      
                      {setting.api_name === 'naver_news_collector' && (
                        <button
                          onClick={runNewsCollection}
                          className="btn-primary"
                          disabled={loading}
                        >
                          수동 실행
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>API 설정이 없습니다.</p>
          )}
        </div>
        
        <div className="card">
          <h3>사용자 관리</h3>
          {loading ? (
            <p>로딩 중...</p>
          ) : users && users.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>이메일</th>
                  <th>사용자 이름</th>
                  <th>가입일</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.email}>
                    <td>{user.email}</td>
                    <td>{user.username || '-'}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>사용자가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="container">
      <Head>
        <title>관리자 대시보드 | 네이버 뉴스 수집기</title>
        <meta name="description" content="네이버 뉴스 수집기 관리자 대시보드" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main>
        {isLoggedIn ? renderDashboard() : renderLoginForm()}
      </main>
      
      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
        }
        
        main {
          padding: 2rem 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .login-form {
          width: 100%;
          max-width: 400px;
          padding: 2rem;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .login-form h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .form-group {
          margin-bottom: 1rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        button {
          width: 100%;
          padding: 0.75rem;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }
        
        button:hover:not(:disabled) {
          background-color: #0051a2;
        }
        
        button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .error {
          padding: 0.75rem;
          margin-bottom: 1rem;
          background-color: #ffebee;
          color: #c62828;
          border-radius: 4px;
        }
        
        .dashboard {
          width: 100%;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eaeaea;
        }
        
        .header h2 {
          margin: 0;
        }
        
        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .user-info button {
          width: auto;
          padding: 0.5rem 1rem;
        }
        
        .dashboard-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }
        
        .card {
          padding: 1.5rem;
          border: 1px solid #eaeaea;
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .card h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #eaeaea;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #eaeaea;
        }
        
        th {
          font-weight: 600;
          background-color: #f9f9f9;
        }
        
        .status {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        
        .status.active {
          background-color: #e6f7e6;
          color: #2e7d32;
        }
        
        .status.inactive {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .btn-success {
          background-color: #2e7d32;
        }
        
        .btn-danger {
          background-color: #c62828;
        }
        
        .btn-primary {
          background-color: #0070f3;
          margin-left: 0.5rem;
        }
        
        td button {
          width: auto;
          padding: 0.25rem 0.5rem;
          font-size: 0.875rem;
        }
        
        @media (min-width: 768px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
} 