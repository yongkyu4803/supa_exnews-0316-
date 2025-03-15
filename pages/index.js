import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import ArticleList from '../components/ArticleList';
import CategoryFilter from '../components/CategoryFilter';
import Pagination from '../components/Pagination';
import AuthForm from '../components/AuthForm';
import FeedbackForm from '../components/FeedbackForm';

export default function Home() {
  // 상태 관리
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [copySuccess, setCopySuccess] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // 사용자 인증 상태 확인
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );
    
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  
  // 기사 데이터 로드
  useEffect(() => {
    fetchArticles();
  }, [currentPage, selectedCategory]);
  
  // 기사 데이터 가져오기
  const fetchArticles = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/articles?page=${currentPage}&pageSize=10${selectedCategory ? `&category=${selectedCategory}` : ''}${user ? `&userEmail=${user.email}` : ''}${forceRefresh ? '&forceRefresh=true' : ''}`);
      
      if (!response.ok) {
        throw new Error('기사를 불러오는 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      setArticles(data.articles);
      setTotalPages(data.pagination.totalPages);
      
      // 메시지가 있으면 에러 메시지로 표시
      if (data.message) {
        setError(data.message);
      }
    } catch (err) {
      console.error('기사 로드 중 오류 발생:', err);
      setError('기사를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // 카테고리 변경 핸들러
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1); // 카테고리 변경 시 첫 페이지로 이동
  };
  
  // 페이지 변경 핸들러
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  // 피드백 모달 열기
  const handleOpenFeedback = (article) => {
    setSelectedArticle(article);
  };
  
  // 피드백 모달 닫기
  const handleCloseFeedback = () => {
    setSelectedArticle(null);
  };

  // 로그인 모달 열기
  const handleOpenLoginModal = () => {
    setShowLoginModal(true);
  };

  // 로그인 모달 닫기
  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
  };

  // 기사 선택 핸들러
  const handleArticleSelect = (article) => {
    setSelectedArticles(prev => {
      // 이미 선택된 기사인지 확인
      const isAlreadySelected = prev.some(a => a.id === article.id);
      
      if (isAlreadySelected) {
        // 이미 선택된 기사라면 제거
        return prev.filter(a => a.id !== article.id);
      } else {
        // 선택되지 않은 기사라면 추가
        return [...prev, article];
      }
    });
  };

  // 선택된 기사 클립보드에 복사
  const copyToClipboard = () => {
    if (selectedArticles.length === 0) {
      setCopySuccess('선택된 기사가 없습니다.');
      setTimeout(() => setCopySuccess(''), 3000);
      return;
    }

    const clipboardText = selectedArticles.map(article => 
      `[단독] ${article.title}\n링크: ${article.originallink || article.link}\n발행시간: ${new Date(article.pubdate || article.pubDate).toLocaleString()}\n\n`
    ).join('');

    navigator.clipboard.writeText(clipboardText)
      .then(() => {
        setCopySuccess('클립보드에 복사되었습니다!');
        setTimeout(() => setCopySuccess(''), 3000);
      })
      .catch(err => {
        setCopySuccess('복사 실패: ' + err);
        setTimeout(() => setCopySuccess(''), 3000);
      });
  };
  
  // 강제 새로고침 핸들러
  const handleForceRefresh = async () => {
    setRefreshing(true);
    await fetchArticles(true);
  };
  
  return (
    <div className="container">
      <Head>
        <title>이 시간 단독뉴스</title>
        <meta name="description" content="네이버 API를 통해 수집한 뉴스 기사 모음" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <header className="header">
        <div className="auth-button">
          {user ? (
            <div className="user-info-mini">
              <span className="user-email-mini">{user.email.split('@')[0]}</span>
              <button className="mini-btn logout-btn" onClick={() => supabase.auth.signOut()}>로그아웃</button>
            </div>
          ) : (
            <button className="mini-btn login-btn" onClick={handleOpenLoginModal}>로그인</button>
          )}
        </div>
        <h1 className="main-title">이 시간 단독뉴스</h1>
        <h2 className="sub-title">Exclusive Stories</h2>
      </header>
      
      <main>
        <div className="top-bar">
          <CategoryFilter 
            selectedCategory={selectedCategory} 
            onCategoryChange={handleCategoryChange} 
          />
          
          <button 
            className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
            onClick={handleForceRefresh}
            disabled={refreshing}
          >
            {refreshing ? '새로고침 중...' : '새 기사 가져오기'}
          </button>
        </div>
        
        <div className="selected-actions">
          <div className="selected-count">
            선택된 기사: {selectedArticles.length}개
          </div>
          <button 
            className="copy-btn" 
            onClick={copyToClipboard}
            disabled={selectedArticles.length === 0}
          >
            클립보드에 복사
          </button>
          {copySuccess && <div className="copy-message">{copySuccess}</div>}
        </div>
        
        {loading ? (
          <div className="loading">기사를 불러오는 중...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            <div className="article-container">
              {articles.length === 0 ? (
                <div className="no-articles">[단독] 기사가 없습니다. '새 기사 가져오기' 버튼을 클릭하여 최신 기사를 검색해보세요.</div>
              ) : (
                articles.map(article => (
                  <div 
                    key={article.id} 
                    className={`article-item ${selectedArticles.some(a => a.id === article.id) ? 'selected' : ''}`}
                    onClick={() => handleArticleSelect(article)}
                  >
                    <div className="article-header">
                      <h3 className="article-title">
                        <span className="exclusive-tag">[단독]</span> {article.title.replace(/^\[단독\]\s*/, '')}
                      </h3>
                      <div className="article-meta">
                        <span className="article-date">{new Date(article.pubdate || article.pubDate).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="article-actions">
                      <a 
                        href={article.originallink || article.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="article-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        원문 보기
                      </a>
                      {user && (
                        <button 
                          className="feedback-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFeedback(article);
                          }}
                        >
                          피드백
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          </>
        )}
        
        {selectedArticle && user && (
          <FeedbackForm 
            article={selectedArticle} 
            userEmail={user.email} 
            onClose={handleCloseFeedback} 
          />
        )}

        {showLoginModal && (
          <div className="modal-overlay" onClick={handleCloseLoginModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={handleCloseLoginModal}>×</button>
              <h3 className="modal-title">로그인</h3>
              <AuthForm onSuccess={handleCloseLoginModal} />
            </div>
          </div>
        )}
      </main>
      
      <footer>
        <p>© 2023 이 시간 단독뉴스. All rights reserved.</p>
      </footer>
      
      <style jsx>{`
        .container {
          min-height: 100vh;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          background-color: #f8f9fa;
        }
        
        .header {
          width: 100%;
          background: linear-gradient(135deg, #0047ab, #e63946);
          color: white;
          padding: 2rem 0;
          text-align: center;
          position: relative;
        }
        
        .auth-button {
          position: absolute;
          top: 10px;
          right: 20px;
          z-index: 10;
        }
        
        .mini-btn {
          padding: 0.3rem 0.6rem;
          font-size: 0.75rem;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .mini-btn:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
        
        .user-info-mini {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .user-email-mini {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .main-title {
          margin: 0;
          font-size: 2.5rem;
          font-weight: 700;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3);
        }
        
        .sub-title {
          margin: 0.5rem 0 0;
          font-size: 1.2rem;
          font-weight: 400;
          color: #f0f0f0;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
        }
        
        main {
          padding: 2rem 1rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 1200px;
        }
        
        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          width: 100%;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .selected-actions {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .selected-count {
          font-size: 0.9rem;
          color: #555;
        }
        
        .copy-btn {
          padding: 0.4rem 0.8rem;
          background-color: #4a6fa5;
        }
        
        .copy-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .copy-message {
          font-size: 0.9rem;
          color: #28a745;
          margin-left: 1rem;
        }
        
        .article-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
          margin-bottom: 2rem;
        }
        
        .article-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem 1rem;
          background-color: white;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          cursor: pointer;
          transition: all 0.2s ease;
          border-left: 3px solid transparent;
          flex-wrap: wrap;
        }
        
        .article-item:hover {
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
        }
        
        .article-item.selected {
          border-left-color: #4a6fa5;
          background-color: #f0f4f8;
        }
        
        .article-header {
          flex: 1;
          min-width: 250px;
        }
        
        .article-title {
          margin: 0 0 0.3rem;
          font-size: 1rem;
          font-weight: 500;
          color: #333;
        }
        
        .exclusive-tag {
          display: inline-block;
          background-color: #e63946;
          color: white;
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          font-size: 0.8rem;
          font-weight: bold;
          margin-right: 0.3rem;
        }
        
        .article-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: #777;
          flex-wrap: wrap;
        }
        
        .article-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        
        .article-link {
          padding: 0.3rem 0.6rem;
          font-size: 0.8rem;
          background-color: #f0f0f0;
          color: #333;
          border-radius: 4px;
          text-decoration: none;
          transition: background-color 0.2s;
        }
        
        .article-link:hover {
          background-color: #e0e0e0;
        }
        
        .feedback-btn {
          padding: 0.3rem 0.6rem;
          font-size: 0.8rem;
          background-color: #6c757d;
        }
        
        .no-articles {
          padding: 2rem;
          text-align: center;
          background-color: #f8f9fa;
          border-radius: 4px;
          color: #666;
          font-size: 1.1rem;
          border: 1px dashed #ccc;
          margin: 1rem 0;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background-color: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          position: relative;
          width: 90%;
          max-width: 400px;
        }
        
        .modal-close {
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        
        .modal-close:hover {
          background-color: #f0f0f0;
        }
        
        .modal-title {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.3rem;
          color: #333;
          text-align: center;
        }
        
        .loading, .error {
          margin: 2rem 0;
          font-size: 1.2rem;
          text-align: center;
        }
        
        .error {
          color: #dc3545;
        }
        
        footer {
          width: 100%;
          padding: 1.5rem 0;
          border-top: 1px solid #eaeaea;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f0f0f0;
          font-size: 0.9rem;
          color: #666;
        }
        
        /* 모바일 반응형 스타일 */
        @media (max-width: 768px) {
          .main-title {
            font-size: 2rem;
          }
          
          .sub-title {
            font-size: 1rem;
          }
          
          .top-bar {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .article-item {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .article-header {
            width: 100%;
            margin-bottom: 0.5rem;
          }
          
          .article-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
        
        @media (max-width: 480px) {
          .main-title {
            font-size: 1.8rem;
          }
          
          .header {
            padding: 1.5rem 0;
          }
          
          main {
            padding: 1rem 0.5rem;
          }
          
          .selected-actions {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .copy-message {
            margin-left: 0;
            margin-top: 0.5rem;
          }
          
          .modal-content {
            padding: 1.5rem;
          }
        }
        
        .refresh-btn {
          padding: 0.4rem 0.8rem;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .refresh-btn:hover {
          background-color: #218838;
        }
        
        .refresh-btn.refreshing {
          background-color: #6c757d;
          cursor: not-allowed;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <style jsx global>{`
        html,
        body {
          padding: 0;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
            Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
        }
        
        * {
          box-sizing: border-box;
        }
        
        button {
          padding: 0.5rem 1rem;
          font-size: 1rem;
          background-color: #0070f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        button:hover {
          background-color: #0051a2;
        }
        
        @media (max-width: 768px) {
          button {
            padding: 0.4rem 0.8rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
} 