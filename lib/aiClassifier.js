import Anthropic from '@anthropic-ai/sdk';

// Anthropic API 키
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Anthropic 클라이언트 초기화
let anthropic = null;

try {
  if (ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });
  } else {
    console.warn('Anthropic API 키가 설정되지 않았습니다. AI 분류 기능이 비활성화됩니다.');
  }
} catch (error) {
  console.error('Anthropic 클라이언트 초기화 중 오류 발생:', error);
}

/**
 * 기사 내용을 기반으로 카테고리를 분류합니다.
 * @param {Object} article - 분류할 기사 객체
 * @returns {Promise<string>} - 분류된 카테고리
 */
export async function classifyArticle(article) {
  try {
    // API 키 또는 클라이언트가 없는 경우 기본 카테고리 반환
    if (!ANTHROPIC_API_KEY || !anthropic) {
      console.warn('Anthropic API 키 또는 클라이언트가 없어 기본 카테고리를 반환합니다.');
      return '기타';
    }
    
    const { title, description } = article;
    
    // 프롬프트 구성
    const prompt = `
다음 뉴스 기사의 제목과 내용을 분석하여 가장 적합한 카테고리를 선택해주세요.
카테고리는 '정치', '경제', '사회', '국제', '문화', '스포츠', '과학', 'IT', '연예', '기타' 중에서 선택해야 합니다.
답변은 카테고리 이름만 작성해주세요.

제목: ${title}
내용: ${description}
`;

    try {
      // Anthropic API 호출
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        temperature: 0,
        system: '당신은 뉴스 기사를 분류하는 AI 도우미입니다. 주어진 카테고리 중에서만 선택하세요.',
        messages: [
          { role: 'user', content: prompt }
        ]
      });
      
      // 응답에서 카테고리 추출
      const category = response.content[0].text.trim();
      
      // 유효한 카테고리인지 확인
      const validCategories = ['정치', '경제', '사회', '국제', '문화', '스포츠', '과학', 'IT', '연예', '기타'];
      if (validCategories.includes(category)) {
        return category;
      } else {
        console.warn(`유효하지 않은 카테고리 응답: ${category}, 기본값 '기타'로 설정합니다.`);
        return '기타';
      }
    } catch (apiError) {
      console.error('Anthropic API 호출 중 오류 발생:', apiError);
      return '기타';
    }
  } catch (error) {
    console.error('기사 분류 중 오류 발생:', error);
    return '기타';
  }
}

/**
 * 여러 기사를 일괄 분류합니다.
 * @param {Array<Object>} articles - 분류할 기사 배열
 * @returns {Promise<Array<Object>>} - 카테고리가 추가된 기사 배열
 */
export async function batchClassifyArticles(articles) {
  try {
    // API 키 또는 클라이언트가 없는 경우 기본 카테고리 설정
    if (!ANTHROPIC_API_KEY || !anthropic) {
      console.warn('Anthropic API 키 또는 클라이언트가 없어 모든 기사에 기본 카테고리를 설정합니다.');
      return articles.map(article => ({ ...article, category: '기타' }));
    }
    
    // Vercel 환경에서는 처리할 기사 수를 제한
    const isVercel = process.env.VERCEL === '1';
    const maxArticlesToClassify = isVercel ? 10 : articles.length;
    
    if (isVercel && articles.length > maxArticlesToClassify) {
      console.log(`Vercel 환경에서 실행 중입니다. ${articles.length}개 중 ${maxArticlesToClassify}개 기사만 분류합니다.`);
    }
    
    const articlesToProcess = articles.slice(0, maxArticlesToClassify);
    const remainingArticles = articles.slice(maxArticlesToClassify);
    
    // 분류 작업 병렬 처리 (최대 3개씩)
    const batchSize = 3;
    const classifiedArticles = [];
    
    for (let i = 0; i < articlesToProcess.length; i += batchSize) {
      const batch = articlesToProcess.slice(i, i + batchSize);
      console.log(`기사 분류 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(articlesToProcess.length/batchSize)} 처리 중 (${batch.length}개 기사)`);
      
      const batchPromises = batch.map(async (article) => {
        try {
          const category = await classifyArticle(article);
          return { ...article, category };
        } catch (error) {
          console.error(`기사 "${article.title.substring(0, 30)}..." 분류 중 오류 발생:`, error);
          return { ...article, category: '기타' };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      classifiedArticles.push(...batchResults);
      
      // 배치 간 짧은 지연 추가
      if (i + batchSize < articlesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 나머지 기사에 기본 카테고리 설정
    const remainingWithDefaultCategory = remainingArticles.map(article => ({ ...article, category: '기타' }));
    
    // 모든 기사 결합
    const result = [...classifiedArticles, ...remainingWithDefaultCategory];
    console.log(`총 ${articles.length}개 기사 중 ${classifiedArticles.length}개 분류 완료, ${remainingWithDefaultCategory.length}개는 기본 카테고리 설정`);
    
    return result;
  } catch (error) {
    console.error('기사 일괄 분류 중 오류 발생:', error);
    // 오류 발생 시 모든 기사에 기본 카테고리 설정
    return articles.map(article => ({ ...article, category: '기타' }));
  }
}
