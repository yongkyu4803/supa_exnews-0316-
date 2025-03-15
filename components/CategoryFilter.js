import React from 'react';

/**
 * 카테고리 필터링을 위한 컴포넌트
 * @param {string} selectedCategory - 현재 선택된 카테고리
 * @param {Function} onCategoryChange - 카테고리 변경 핸들러
 */
const CategoryFilter = ({ selectedCategory, onCategoryChange }) => {
  // 카테고리 목록
  const categories = [
    { id: 'all', name: '전체' },
    { id: '정치', name: '정치' },
    { id: '경제', name: '경제' },
    { id: '사회', name: '사회' },
    { id: '문화', name: '문화' },
    { id: '국제', name: '국제' },
    { id: '연예', name: '연예' },
    { id: '스포츠', name: '스포츠' },
    { id: '기타', name: '기타' }
  ];
  
  // 카테고리 변경 핸들러
  const handleCategoryClick = (categoryId) => {
    // '전체'를 선택한 경우 null로 설정 (필터링 없음)
    const newCategory = categoryId === 'all' ? null : categoryId;
    onCategoryChange(newCategory);
  };
  
  return (
    <div className="category-filter">
      <h3 className="filter-title">카테고리 필터</h3>
      <div className="category-buttons">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`category-button ${
              (selectedCategory === category.id) || 
              (selectedCategory === null && category.id === 'all') 
                ? 'active' 
                : ''
            }`}
            onClick={() => handleCategoryClick(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      <style jsx>{`
        .category-filter {
          width: 100%;
          margin-bottom: 2rem;
        }
        
        .filter-title {
          margin-bottom: 1rem;
          font-size: 1.2rem;
          color: #333;
        }
        
        .category-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .category-button {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          background-color: #f0f0f0;
          color: #333;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .category-button:hover {
          background-color: #e0e0e0;
        }
        
        .category-button.active {
          background-color: #0070f3;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default CategoryFilter; 