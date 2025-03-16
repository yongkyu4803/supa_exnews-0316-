import axios from 'axios';

// 사이트 URL 환경 변수
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * HTML 태그를 제거하는 함수
 * @param {string} html - HTML 태그가 포함된 문자열
 * @returns {string} - HTML 태그가 제거된 문자열
 */
function removeHtmlTags(html) {
  return html.replace(/<\/?[^>]+(>|$)/g, '');
}

/**
 * 네이버 뉴스 API를 호출하여 기사 목록을 가져옵니다.
 * @param {string} query - 검색할 키워드
 * @param {number} display - 가져올 기사 수 (최대 100)
 * @param {number} start - 검색 시작 위치 (1부터 시작)
 * @param {string} sort - 정렬 방식 ('sim': 정확도순, 'date': 날짜순)
 * @returns {Promise<Array>} - 기사 목록
 */
export async function fetchNewsArticles(query = '[단독]', display = 100, start = 1, sort = 'date') {
  try {
    console.log(`네이버 뉴스 API 호출: query="${query}", display=${display}, start=${start}, sort=${sort}`);
    
    // 내부 프록시 API를 통해 네이버 API 호출
    const apiUrl = `${SITE_URL}/api/naver-search?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`;
    console.log('API 호출 URL:', apiUrl);
    
    const response = await axios.get(apiUrl);
    
    const items = response.data.items || [];
    console.log('API 응답 메타데이터:', {
      total: response.data.total,
      start: response.data.start,
      display: response.data.display,
      lastBuildDate: response.data.lastBuildDate,
      itemCount: items.length
    });
    
    if (items.length === 0) {
      console.log('API 응답에 기사가 없습니다.');
      return [];
    }
    
    // 원본 타이틀 출력 (최대 5개만)
    console.log('\n원본 타이틀 샘플:');
    items.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.title}`);
    });
    
    // [단독] 또는 <단독> 포함된 기사 필터링
    const filteredItems = items.filter(item => {
      const title = removeHtmlTags(item.title).trim();
      const hasExclusive = title.includes('[단독]') || title.includes('<단독>');
      return hasExclusive;
    });
    
    console.log(`\n총 ${items.length}개 기사 중 단독 기사 ${filteredItems.length}개를 찾았습니다.`);
    
    return filteredItems;
  } catch (error) {
    console.error('네이버 API 호출 중 오류 발생:', error);
    if (error.response) {
      console.error('API 응답:', error.response.data);
      console.error('상태 코드:', error.response.status);
    }
    throw error;
  }
}

/**
 * 네이버 API 응답 데이터를 정제합니다.
 * @param {Object} article - 네이버 API 응답 기사 데이터
 * @returns {Object} - 정제된 기사 데이터
 */
export function cleanArticleData(article) {
  // 제목과 링크에서 HTML 태그 제거
  const title = removeHtmlTags(article.title).trim();
  const description = removeHtmlTags(article.description).trim();
  
  // 고유 ID 생성 (링크 기반)
  const id = generateUUID();
  
  // 날짜 형식 변환
  const pubdate = new Date(article.pubDate).toISOString();
  
  // 정제된 데이터 반환
  return {
    id,
    title,
    description,
    link: article.link,
    originallink: article.originallink || article.link,
    pubdate,
    source: article.originallink ? new URL(article.originallink).hostname : new URL(article.link).hostname,
    category: null, // 카테고리는 AI 분류기에서 설정
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * UUID v4를 생성합니다.
 * @returns {string} - 생성된 UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 여러 키워드에 대한 뉴스 기사를 수집합니다.
 * @param {Array<string>} keywords - 검색할 키워드 목록 (사용하지 않음)
 * @param {number} display - 가져올 기사 수 (최대 100)
 * @returns {Promise<Array>} - 수집된 모든 기사 목록
 */
export async function fetchMultipleKeywords(keywords, display = 100) {
  try {
    console.log('네이버 뉴스 API에서 단독 기사를 검색합니다.');
    
    // 첫 번째 페이지 검색 - 최대 100개 가져오기
    let allArticles = await fetchNewsArticles('[단독]', 100);
    console.log(`첫 번째 페이지 검색 결과: ${allArticles.length}개의 기사`);
    
    // 두 번째 페이지 검색 (필요한 경우)
    if (allArticles.length === 100 && display > 100) {
      try {
        const secondPageArticles = await fetchNewsArticles('[단독]', 100, 101);
        allArticles = [...allArticles, ...secondPageArticles];
        console.log(`두 번째 페이지 검색 결과: ${secondPageArticles.length}개의 기사`);
      } catch (secondPageError) {
        console.error('두 번째 페이지 검색 중 오류 발생:', secondPageError.message);
        // 첫 번째 페이지 결과만 사용
      }
    }
    
    // 중복 링크 필터링
    const uniqueArticles = Array.from(
      new Map(allArticles.map(article => [article.link, article])).values()
    );
    
    console.log(`중복 제거 후: ${uniqueArticles.length}개의 기사`);
    
    // 최신순 정렬
    uniqueArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // 요청된 수만큼만 반환
    const limitedArticles = uniqueArticles.slice(0, display);
    console.log(`네이버 API에서 총 ${limitedArticles.length}개의 [단독] 기사를 수집했습니다.`);
    
    return limitedArticles;
  } catch (error) {
    console.error('뉴스 검색 중 오류 발생:', error);
    console.error('에러 상세:', error.message);
    // 오류가 발생해도 빈 배열 반환하여 애플리케이션이 계속 작동하도록 함
    return [];
  }
}
