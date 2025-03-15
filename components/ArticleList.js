import React from 'react';

/**
 * 기사 목록을 표시하는 컴포넌트
 * @param {Array} articles - 표시할 기사 목록
 * @param {Function} onFeedbackClick - 피드백 버튼 클릭 핸들러
 */
const ArticleList = ({ articles, onFeedbackClick }) => {
  // 기사가 없는 경우
  if (!articles || articles.length === 0) {
    return <div className="no-articles">표시할 기사가 없습니다.</div>;
  }
  
  // 날짜 포맷팅 함수
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="article-list">
      {articles.map((article) => (
        <div key={article.id} className="article-card">
          <div className="article-category">{article.category || '미분류'}</div>
          <h2 className="article-title">
            <a href={article.link} target="_blank" rel="noopener noreferrer">
              {article.title}
            </a>
          </h2>
          <p className="article-description">{article.description}</p>
          <div className="article-meta">
            <span className="article-date">{formatDate(article.pubDate)}</span>
            {article.originallink && (
              <span className="article-source">
                출처: <a href={article.originallink} target="_blank" rel="noopener noreferrer">
                  {new URL(article.originallink).hostname}
                </a>
              </span>
            )}
          </div>
          <div className="article-actions">
            <button 
              className="feedback-button"
              onClick={() => onFeedbackClick(article)}
            >
              피드백 남기기
            </button>
          </div>
        </div>
      ))}
      
      <style jsx>{`
        .article-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .no-articles {
          text-align: center;
          font-size: 1.2rem;
          margin: 2rem 0;
        }
        
        .article-card {
          border: 1px solid #eaeaea;
          border-radius: 10px;
          padding: 1.5rem;
          transition: box-shadow 0.3s ease;
          position: relative;
        }
        
        .article-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .article-category {
          position: absolute;
          top: -10px;
          right: 20px;
          background-color: #0070f3;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        
        .article-title {
          margin-top: 0.5rem;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        
        .article-title a {
          color: #0070f3;
          text-decoration: none;
        }
        
        .article-title a:hover {
          text-decoration: underline;
        }
        
        .article-description {
          color: #666;
          margin-bottom: 1rem;
          line-height: 1.5;
        }
        
        .article-meta {
          display: flex;
          justify-content: space-between;
          color: #888;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        
        .article-source a {
          color: #0070f3;
          text-decoration: none;
        }
        
        .article-source a:hover {
          text-decoration: underline;
        }
        
        .article-actions {
          display: flex;
          justify-content: flex-end;
        }
        
        .feedback-button {
          background-color: transparent;
          color: #0070f3;
          border: 1px solid #0070f3;
        }
        
        .feedback-button:hover {
          background-color: #f0f7ff;
        }
      `}</style>
    </div>
  );
};

export default ArticleList; 