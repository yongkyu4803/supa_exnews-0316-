import { getArticles, logUserAction, saveArticle } from '../../lib/supabase';
import { fetchMultipleKeywords, cleanArticleData } from '../../lib/naverApi';
import { batchClassifyArticles } from '../../lib/aiClassifier';

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
    NAVER_CLIENT_ID_EXISTS: !!process.env.NAVER_CLIENT_ID,
    NAVER_CLIENT_SECRET_EXISTS: !!process.env.NAVER_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV
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
    if ((data.length === 0 || forceRefresh === 'true')) {
      // 네이버 API 키 확인
      if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
        console.error('네이버 API 키가 설정되지 않았습니다.');
        return res.status(200).json({
          articles: data,
          pagination: {
            total: count,
            page: pageNum,
            pageSize: pageSizeNum,
            totalPages: Math.ceil(count / pageSizeNum)
          },
          message: '네이버 API 키가 설정되지 않아 새 기사를 가져올 수 없습니다.'
        });
      }
      
      console.log('Supabase에 데이터가 없거나 강제 새로고침 요청이 있어 네이버 API에서 직접 데이터를 가져옵니다.');
      
      try {
        // 네이버 API를 통해 기사 수집
        const rawArticles = await fetchMultipleKeywords(null, 100);
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
          
          // Supabase에 저장 (순차적으로 처리하여 중복 방지)
          for (const article of classifiedArticles) {
            try {
              // 저장 전 기사 데이터 로깅
              console.log(`저장 시도: ID=${article.id}, 제목=${article.title.substring(0, 30)}...`);
              
              const savedArticle = await saveArticle(article);
              if (savedArticle) {
                const savedId = typeof savedArticle === 'object' ? savedArticle.id : savedArticle;
                savedArticleIds.add(savedId);
                console.log(`기사 저장 성공: ID=${savedId}`);
              }
            } catch (saveError) {
              errorCount++;
              console.error(`기사 저장 중 오류 발생 (${article.title.substring(0, 30)}...):`, saveError);
              // 오류 세부 정보 로깅
              if (saveError.details) {
                console.error('오류 세부 정보:', saveError.details);
              }
            }
          }
          
          console.log(`${savedArticleIds.size}개의 단독 기사가 저장/업데이트되었습니다. 오류 발생: ${errorCount}개`);
          
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