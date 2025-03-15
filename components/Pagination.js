import React from 'react';

/**
 * 페이지네이션 컴포넌트
 * @param {number} currentPage - 현재 페이지
 * @param {number} totalPages - 전체 페이지 수
 * @param {Function} onPageChange - 페이지 변경 핸들러
 */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // 페이지가 1개 이하인 경우 렌더링하지 않음
  if (totalPages <= 1) {
    return null;
  }
  
  // 페이지 번호 배열 생성
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // 한 번에 표시할 최대 페이지 수
    
    // 시작 페이지와 끝 페이지 계산
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    
    // 끝 페이지가 전체 페이지 수를 초과하는 경우 조정
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    // 페이지 번호 배열 생성
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  };
  
  // 이전 페이지로 이동
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };
  
  // 다음 페이지로 이동
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };
  
  // 첫 페이지로 이동
  const goToFirstPage = () => {
    onPageChange(1);
  };
  
  // 마지막 페이지로 이동
  const goToLastPage = () => {
    onPageChange(totalPages);
  };
  
  return (
    <div className="pagination">
      <button
        className="pagination-button"
        onClick={goToFirstPage}
        disabled={currentPage === 1}
      >
        &laquo;
      </button>
      
      <button
        className="pagination-button"
        onClick={goToPreviousPage}
        disabled={currentPage === 1}
      >
        &lsaquo;
      </button>
      
      {getPageNumbers().map((pageNumber) => (
        <button
          key={pageNumber}
          className={`pagination-button ${currentPage === pageNumber ? 'active' : ''}`}
          onClick={() => onPageChange(pageNumber)}
        >
          {pageNumber}
        </button>
      ))}
      
      <button
        className="pagination-button"
        onClick={goToNextPage}
        disabled={currentPage === totalPages}
      >
        &rsaquo;
      </button>
      
      <button
        className="pagination-button"
        onClick={goToLastPage}
        disabled={currentPage === totalPages}
      >
        &raquo;
      </button>
      
      <style jsx>{`
        .pagination {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
          gap: 0.5rem;
        }
        
        .pagination-button {
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          background-color: white;
          color: #333;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .pagination-button:hover:not(:disabled) {
          background-color: #f0f0f0;
        }
        
        .pagination-button.active {
          background-color: #0070f3;
          color: white;
          border-color: #0070f3;
        }
        
        .pagination-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Pagination; 