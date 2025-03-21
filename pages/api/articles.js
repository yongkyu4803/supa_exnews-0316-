import { getArticles, logUserAction, saveArticle } from '../../lib/supabase';
import { fetchMultipleKeywords, cleanArticleData } from '../../lib/naverApi.new';
import { batchClassifyArticles } from '../../lib/aiClassifier.new';

/**
 * 기사 목록을 조회하는 API 엔드포인트
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET 요청만 처리
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  }
  
  // 환경 변수 디버깅 로그
  console.log('환경 변수 확인:', {
    NODE_ENV: process.env.NODE_ENV,
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL: process.env.VERCEL
  });
  
  try {
    // 쿼리 파라미터 추출
    const { page = 1, pageSize = 10, category, userEmail, forceRefresh } = req.query;
    
    // 페이지 및 페이지 크기를 숫자로 변환
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    
    // 유효성 검사
    if (isNaN(pageNum) || isNaN(pageSizeNum) || pageNum < 1 || pageSizeNum < 1 || pageSizeNum > 100) {
      return res.status(400).json({ error: '유효하지 않은 페이지 파라미터입니다.' });
    }
    
    // 기사 조회
    let { data, count } = await getArticles({
      page: pageNum,
      pageSize: pageSizeNum,
      category: category || null
    });
    
    // 데이터가 없거나 강제 새로고침 요청이 있는 경우 네이버 API에서 직접 데이터 가져오기
    if (data.length === 0 || forceRefresh === 'true') {
      console.log('Supabase에 데이터가 없거나 강제 새로고침 요청이 있어 네이버 API에서 직접 데이터를 가져옵니다.');
      
      try {
        // Vercel 환경에서는 처리할 기사 수를 제한
        const maxArticlesToFetch = process.env.VERCEL === '1' ? 30 : 100;
        console.log(`최대 ${maxArticlesToFetch}개의 기사를 가져옵니다.`);
        
        // 네이버 API를 통해 기사 수집 (프록시 API 사용)
        const rawArticles = await fetchMultipleKeywords(null, maxArticlesToFetch);
        console.log(`네이버 API에서 단독 기사 ${rawArticles.length}개를 가져왔습니다.`);
        
        if (rawArticles.length > 0) {
          // 기사 데이터 정제
          const cleanedArticles = rawArticles.map(cleanArticleData);
          console.log(`${cleanedArticles.length}개의 단독 기사 데이터를 정제했습니다.`);
          
          // AI를 사용하여 기사 카테고리 분류 (선택적)
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
          
          console.log(`${savedArticleIds.size}개의 [단독] 기사가 저장/업데이트되었습니다. 오류 발생: ${errorCount}개`);
          
          // 저장 후 최신 데이터 다시 조회
          try {
            const refreshedData = await getArticles({
              page: pageNum,
              pageSize: pageSizeNum,
              category: category || null
            });
            
            data = refreshedData.data;
            count = refreshedData.count;
            console.log(`${count}개의 기사를 다시 조회했습니다.`);
          } catch (refreshError) {
            console.error('저장 후 데이터 조회 중 오류 발생:', refreshError);
          }
        } else {
          console.log('네이버 API에서 가져온 단독 기사가 없습니다.');
          // 결과가 없을 때 메시지 추가
          if (data.length === 0) {
            return res.status(200).json({
              articles: [],
              pagination: {
                total: 0,
                page: pageNum,
                pageSize: pageSizeNum,
                totalPages: 0
              },
              message: '단독 기사를 찾을 수 없습니다. 나중에 다시 시도해주세요.'
            });
          }
        }
      } catch (apiError) {
        console.error('네이버 API 호출 중 오류 발생:', apiError);
        // API 호출 실패 시 기존 데이터 사용
        return res.status(200).json({
          articles: data,
          pagination: {
            total: count,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages: Math.ceil(count / pageSizeNum)
          },
          message: '네이버 API 호출 중 오류가 발생했습니다: ' + apiError.message
        });
      }
    }
    
    // 사용자 활동 로깅 (선택적)
    if (userEmail) {
      await logUserAction(userEmail, 'view_articles').catch(logError => {
        console.error('사용자 활동 로깅 중 오류 발생:', logError);
      });
    }
    
    // 응답 반환
    res.status(200).json({
      articles: data,
      pagination: {
        total: count,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(count / pageSizeNum)
      }
    });
  } catch (error) {
    console.error('기사 조회 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
