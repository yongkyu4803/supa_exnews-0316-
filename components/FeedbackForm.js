import React, { useState } from 'react';

/**
 * 사용자 피드백 수집 폼 컴포넌트
 * @param {Object} article - 피드백을 남길 기사 정보
 * @param {string} userEmail - 사용자 이메일
 * @param {Function} onClose - 모달 닫기 핸들러
 */
const FeedbackForm = ({ article, userEmail, onClose }) => {
  // 상태 관리
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // API 요청
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: article.id,
          userEmail,
          userComment: comment,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '피드백 저장 중 오류가 발생했습니다.');
      }
      
      // 성공 상태 설정
      setSuccess(true);
      
      // 3초 후 모달 닫기
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal">
        <button className="close-button" onClick={onClose}>×</button>
        
        <h3 className="modal-title">기사 피드백</h3>
        
        <div className="article-info">
          <h4>{article.title}</h4>
          <p className="article-category">{article.category || '미분류'}</p>
        </div>
        
        {success ? (
          <div className="success-message">
            피드백이 성공적으로 저장되었습니다. 감사합니다!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="comment">의견을 남겨주세요</label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="이 기사에 대한 의견을 작성해주세요."
                rows={5}
                disabled={loading}
              />
            </div>
            
            <div className="form-actions">
              <button type="button" className="cancel-button" onClick={onClose} disabled={loading}>
                취소
              </button>
              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? '저장 중...' : '피드백 저장'}
              </button>
            </div>
          </form>
        )}
      </div>
      
      <style jsx>{`
        .feedback-modal-overlay {
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
        
        .feedback-modal {
          background-color: white;
          border-radius: 10px;
          padding: 2rem;
          width: 90%;
          max-width: 500px;
          position: relative;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .close-button {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
        }
        
        .close-button:hover {
          color: #333;
        }
        
        .modal-title {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          text-align: center;
        }
        
        .article-info {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eaeaea;
        }
        
        .article-info h4 {
          margin-top: 0;
          margin-bottom: 0.5rem;
        }
        
        .article-category {
          display: inline-block;
          background-color: #0070f3;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.8rem;
          margin: 0;
        }
        
        .success-message {
          background-color: #e6f7e6;
          color: #2e7d32;
          padding: 1rem;
          border-radius: 4px;
          text-align: center;
          margin: 1rem 0;
        }
        
        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 0.75rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        
        textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          resize: vertical;
        }
        
        textarea:focus {
          outline: none;
          border-color: #0070f3;
          box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.2);
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        
        .cancel-button {
          padding: 0.75rem 1.5rem;
          background-color: transparent;
          color: #666;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
        }
        
        .cancel-button:hover:not(:disabled) {
          background-color: #f5f5f5;
        }
        
        .submit-button {
          padding: 0.75rem 1.5rem;
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
        
        button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default FeedbackForm; 