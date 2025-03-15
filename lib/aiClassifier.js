import Anthropic from '@anthropic-ai/sdk';

// Anthropic API 키
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// 환경 변수가 설정되지 않은 경우 오류 메시지 출력
if (!ANTHROPIC_API_KEY) {
  console.error('Anthropic API 키가 설정되지 않았습니다.');
}

// Anthropic 클라이언트 초기화
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

/**
 * 기사 내용을 기반으로 카테고리를 분류합니다.
 * @param {Object} article - 기사 데이터 (title, description 포함)
 * @returns {Promise<string>} - 분류된 카테고리
 */
export async function classifyArticle(article) {
  try {
    const { title, description } = article;
    
    // 프롬프트 구성
    const prompt = `
    다음 뉴스 기사의 제목과 내용을 분석하여 가장 적합한 카테고리를 선택해주세요.
    카테고리는 다음 중 하나여야 합니다: 정치, 경제, 사회, 문화, 국제, 연예, 스포츠, 기타
    
    제목: ${title}
    내용: ${description}
    
    응답은 카테고리 이름만 정확히 작성해주세요. 추가 설명이나 다른 텍스트는 포함하지 마세요.
    `;
    
    // Anthropic API 호출
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 10,
      temperature: 0,
      system: "당신은 뉴스 기사를 분류하는 AI 도우미입니다. 주어진 기사의 제목과 내용을 분석하여 가장 적합한 카테고리를 선택해주세요. 응답은 카테고리 이름만 정확히 작성해주세요.",
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    // 응답에서 카테고리 추출
    const category = response.content[0].text.trim();
    
    // 유효한 카테고리인지 확인
    const validCategories = ['정치', '경제', '사회', '문화', '국제', '연예', '스포츠', '기타'];
    if (!validCategories.includes(category)) {
      return '기타';
    }
    
    return category;
  } catch (error) {
    console.error('기사 분류 중 오류 발생:', error);
    return '기타'; // 오류 발생 시 기본값으로 '기타' 반환
  }
}

/**
 * 여러 기사를 일괄 분류합니다.
 * @param {Array<Object>} articles - 기사 데이터 배열
 * @returns {Promise<Array<Object>>} - 카테고리가 추가된 기사 데이터 배열
 */
export async function batchClassifyArticles(articles) {
  try {
    // 병렬 처리를 위한 Promise 배열 생성
    const promises = articles.map(async (article) => {
      const category = await classifyArticle(article);
      return { ...article, category };
    });
    
    // 모든 분류 작업 완료 대기
    const classifiedArticles = await Promise.all(promises);
    return classifiedArticles;
  } catch (error) {
    console.error('기사 일괄 분류 중 오류 발생:', error);
    
    // 오류 발생 시 기본 카테고리 '기타'로 설정
    return articles.map(article => ({ ...article, category: '기타' }));
  }
} 