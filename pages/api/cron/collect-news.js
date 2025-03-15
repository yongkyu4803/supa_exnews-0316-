import { fetchMultipleKeywords, cleanArticleData } from '../../../lib/naverApi';
import { batchClassifyArticles } from '../../../lib/aiClassifier';
import { saveArticle } from '../../../lib/supabase';
import { supabase } from '../../../lib/supabase';

/**
 * API 설정 확인
 * @returns {Promise<boolean>} API가 활성화되어 있는지 여부
 */
async function checkApiSettings() {
  try {
    const { data, error } = await supabase
      .from('api_settings')
      .select('*')
      .eq('api_name', 'naver_news_collector')
      .single();
    
    if (error) {
      console.error('API 설정 조회 중 오류 발생:', error);
      return true; // 오류 발생 시 기본적으로 활성화 상태로 간주
    }
    
    // API 설정이 없는 경우 기본적으로 활성화 상태로 간주
    if (!data) {
      return true;
    }
    
    // 마지막 실행 시간 업데이트
    await supabase
      .from('api_settings')
      .update({ last_run: new Date() })
      .eq('api_name', 'naver_news_collector');
    
    return data.is_active;
  } catch (error) {
    console.error('API 설정 확인 중 오류 발생:', error);
    return true; // 오류 발생 시 기본적으로 활성화 상태로 간주
  }
}

/**
 * 기사를 수집하고 저장하는 메인 함수
 */
async function collectAndSaveNews() {
  try {
    console.log('기사 수집 시작...', new Date().toISOString());
    
    // API 설정 확인
    const isApiActive = await checkApiSettings();
    
    if (!isApiActive) {
      console.log('API가 비활성화되어 있습니다. 기사 수집을 건너뜁니다.');
      return { success: true, skipped: true, message: 'API가 비활성화되어 있습니다.' };
    }
    
    // 1. 네이버 API를 통해 기사 수집 (단독 기사만)
    const rawArticles = await fetchMultipleKeywords(null, 100);  // 최대 100개의 기사 수집
    console.log(`총 ${rawArticles.length}개의 단독 기사를 수집했습니다.`, new Date().toISOString());
    
    // 수집된 기사가 없는 경우
    if (rawArticles.length === 0) {
      console.log('수집된 단독 기사가 없습니다.');
      return { success: true, count: 0 };
    }
    
    // 2. 기사 데이터 정제
    const cleanedArticles = rawArticles.map(cleanArticleData);
    console.log(`${cleanedArticles.length}개의 기사 데이터를 정제했습니다.`);
    
    // 3. AI를 사용하여 기사 카테고리 분류
    const classifiedArticles = await batchClassifyArticles(cleanedArticles);
    console.log(`${classifiedArticles.length}개의 기사 카테고리 분류 완료`);
    
    // 4. Supabase 데이터베이스에 저장
    const savePromises = classifiedArticles.map(article => saveArticle(article));
    const saveResults = await Promise.all(savePromises);
    const savedCount = saveResults.filter(result => result && result.success).length;
    
    console.log(`${savedCount}개의 기사를 저장했습니다.`, new Date().toISOString());
    return { 
      success: true, 
      count: classifiedArticles.length,
      savedCount,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('기사 수집 및 저장 중 오류 발생:', error);
    return { 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Vercel Serverless Function 핸들러
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  }
  
  // Authorization 헤더 검증
  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('인증 실패:', { 
      receivedAuth: authHeader,
      expectedAuth: `Bearer ${process.env.CRON_SECRET?.substring(0, 5)}...`
    });
    return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
  }

  try {
    const result = await collectAndSaveNews();
    res.status(200).json(result);
  } catch (error) {
    console.error('서버리스 함수 실행 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

// Vercel Cron 설정은 vercel.json에서 관리합니다. 