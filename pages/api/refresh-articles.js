import { fetchMultipleKeywords, cleanArticleData } from '../../lib/naverApi.new';
import { batchClassifyArticles } from '../../lib/aiClassifier.new';
import { saveArticle } from '../../lib/supabase';

/**
 * 기사를 강제로 새로고침하는 API 엔드포인트
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // POST 요청만 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드입니다. POST 요청을 사용하세요.' });
  }
  
  try {
    // 환경 변수 확인
    if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
      console.error('네이버 API 키가 설정되지 않았습니다.');
      return res.status(500).json({ error: '서버 구성 오류: 네이버 API 키가 설정되지 않았습니다.' });
    }
    
    // 요청 시작 시간 기록
    const startTime = Date.now();
    console.log('기사 새로고침 요청 시작:', new Date().toISOString());
    
    // Vercel 환경에서는 처리할 기사 수를 제한
    const maxArticlesToFetch = process.env.VERCEL === '1' ? 30 : 100;
    console.log(`최대 ${maxArticlesToFetch}개의 기사를 가져옵니다.`);
    
    // 네이버 API를 통해 기사 수집
    const rawArticles = await fetchMultipleKeywords(null, maxArticlesToFetch);
    console.log(`네이버 API에서 단독 기사 ${rawArticles.length}개를 가져왔습니다.`);
    
    if (rawArticles.length === 0) {
      console.log('네이버 API에서 가져온 단독 기사가 없습니다.');
      return res.status(200).json({
        success: true,
        message: '새로운 단독 기사를 찾을 수 없습니다.',
        articlesFound: 0,
        articlesSaved: 0,
        timeElapsed: `${(Date.now() - startTime) / 1000}초`
      });
    }
    
    // 기사 데이터 정제
    const cleanedArticles = rawArticles.map(cleanArticleData);
    console.log(`${cleanedArticles.length}개의 단독 기사 데이터를 정제했습니다.`);
    
    // AI를 사용하여 기사 카테고리 분류
    let classifiedArticles;
    try {
      classifiedArticles = await batchClassifyArticles(cleanedArticles);
      console.log(`${classifiedArticles.length}개의 기사 카테고리를 분류했습니다.`);
    } catch (classifyError) {
      console.error('기사 분류 중 오류 발생:', classifyError);
      // 분류 실패 시 기본 카테고리 설정
      classifiedArticles = cleanedArticles.map(article => ({ ...article, category: '기타' }));
      console.log(`분류 실패로 ${classifiedArticles.length}개의 기사에 기본 카테고리를 설정했습니다.`);
    }
    
    // 저장된 기사 ID 추적
    const savedArticleIds = new Set();
    let errorCount = 0;
    
    // 기사를 일괄 처리하는 방식으로 변경
    const batchSize = 5; // 한 번에 처리할 기사 수
    
    for (let i = 0; i < classifiedArticles.length; i += batchSize) {
      const batch = classifiedArticles.slice(i, i + batchSize);
      console.log(`배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(classifiedArticles.length/batchSize)} 처리 중 (${batch.length}개 기사)`);
      
      // 각 배치를 병렬로 처리
      const savePromises = batch.map(article => {
        return new Promise(async (resolve) => {
          try {
            console.log(`저장 시도: ID=${article.id}, 제목=${article.title.substring(0, 30)}...`);
            const savedArticle = await saveArticle(article);
            
            if (savedArticle) {
              const savedId = typeof savedArticle === 'object' ? savedArticle.id : savedArticle;
              savedArticleIds.add(savedId);
              console.log(`기사 저장 성공: ID=${savedId}`);
            }
            resolve(true);
          } catch (saveError) {
            errorCount++;
            console.error(`기사 저장 중 오류 발생 (${article.title.substring(0, 30)}...):`, saveError);
            if (saveError.details) {
              console.error('오류 세부 정보:', saveError.details);
            }
            resolve(false);
          }
        });
      });
      
      // 배치 처리 완료 대기
      await Promise.all(savePromises);
      
      // 배치 간 짧은 지연 추가
      if (i + batchSize < classifiedArticles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 처리 시간 계산
    const timeElapsed = (Date.now() - startTime) / 1000;
    console.log(`처리 완료: ${timeElapsed}초 소요, ${savedArticleIds.size}개의 기사 저장/업데이트, 오류 ${errorCount}개`);
    
    // 응답 반환
    res.status(200).json({
      success: true,
      message: `${savedArticleIds.size}개의 단독 기사가 성공적으로 저장/업데이트되었습니다.`,
      articlesFound: rawArticles.length,
      articlesSaved: savedArticleIds.size,
      errors: errorCount,
      timeElapsed: `${timeElapsed}초`
    });
  } catch (error) {
    console.error('기사 새로고침 중 오류 발생:', error);
    res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.',
      message: error.message
    });
  }
}
