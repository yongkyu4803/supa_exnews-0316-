import axios from 'axios';

// 네이버 API 클라이언트 ID와 시크릿 키
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

// 환경 변수가 설정되지 않은 경우 오류 메시지 출력
if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error('네이버 API 클라이언트 ID 또는 시크릿 키가 설정되지 않았습니다.');
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
    const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      params: {
        query,
        display,
        start,
        sort
      },
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      }
    });
    
    const items = response.data.items || [];
    
    // [단독]으로 시작하는 기사만 필터링
    const filteredItems = items.filter(item => {
      const title = removeHtmlTags(item.title);
      return title.trim().startsWith('[단독]');
    });
    
    console.log(`총 ${items.length}개 기사 중 [단독]으로 시작하는 기사 ${filteredItems.length}개를 찾았습니다.`);
    
    return filteredItems;
  } catch (error) {
    console.error('네이버 API 호출 중 오류 발생:', error);
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
  const cleanTitle = removeHtmlTags(article.title);
  const cleanDescription = removeHtmlTags(article.description);
  const originalLink = article.originallink || article.link;
  const link = article.link;
  
  // 고유 ID 생성 - 링크의 해시값 사용
  // 동일한 기사는 항상 동일한 ID를 가지도록 함
  const id = generateArticleId(link);
  
  // source 필드 제거
  return {
    id,
    title: cleanTitle,
    originallink: originalLink,
    link: link,
    description: cleanDescription,
    pubDate: new Date(article.pubDate)
  };
}

/**
 * 기사 링크로부터 고유 ID를 생성합니다.
 * @param {string} link - 기사 링크
 * @returns {string} - 고유 ID (UUID v4 형식)
 */
function generateArticleId(link) {
  // UUID v4 형식으로 생성 (랜덤 UUID)
  return generateUUID();
}

/**
 * UUID v4를 생성합니다.
 * @returns {string} - UUID v4 형식의 문자열
 */
function generateUUID() {
  // UUID v4 형식: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // 여기서 x는 랜덤 16진수, y는 8, 9, A, B 중 하나
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * HTML 태그를 제거합니다.
 * @param {string} text - HTML 태그가 포함된 텍스트
 * @returns {string} - HTML 태그가 제거된 텍스트
 */
function removeHtmlTags(text) {
  return text.replace(/<\/?[^>]+(>|$)/g, '');
}

/**
 * URL에서 출처(도메인)를 추출합니다.
 * @param {string} url - 기사 URL
 * @returns {string} - 출처 도메인
 */
function extractSource(url) {
  try {
    if (!url) return '알 수 없음';
    
    const domain = new URL(url).hostname;
    return domain.replace(/^www\./, '');
  } catch (error) {
    return '알 수 없음';
  }
}

/**
 * 여러 키워드에 대한 뉴스 기사를 수집합니다.
 * @param {Array<string>} keywords - 검색할 키워드 목록
 * @param {number} display - 각 키워드당 가져올 기사 수
 * @returns {Promise<Array>} - 수집된 모든 기사 목록
 */
export async function fetchMultipleKeywords(keywords, display = 100) {
  try {
    console.log('네이버 뉴스 API에서 [단독] 기사를 검색합니다.');
    
    const articles = await fetchNewsArticles('[단독]', display);
    console.log(`${articles.length}개의 [단독] 기사를 가져왔습니다.`);
    
    // 중복 링크 필터링
    const uniqueArticles = Array.from(
      new Map(articles.map(article => [article.link, article])).values()
    );
    
    // 최신순 정렬
    uniqueArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    return uniqueArticles;
  } catch (error) {
    console.error('뉴스 검색 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 지정된 시간(ms) 동안 대기합니다.
 * @param {number} ms - 대기 시간 (밀리초)
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
} 