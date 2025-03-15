import { fetchMultipleKeywords, cleanArticleData } from '../../../lib/naverApi';
import { batchClassifyArticles } from '../../../lib/aiClassifier';
import { saveArticle } from '../../../lib/supabase';
import { supabase } from '../../../lib/supabase';

// 검색할 키워드 목록
const KEYWORDS = [
  '정치', '경제', '사회', '문화', '국제', '연예', '스포츠',
  '코로나', '기후변화', '테크', 'IT', '과학', '교육',
  '금융', '부동산', '주식', '증시', '환율', '금리',
  '대통령', '국회', '선거', '정당', '법원', '판결',
  '기업', '삼성', 'LG', 'SK', '현대', '네이버', '카카오'
];

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
    console.log('기사 수집 시작...');
    
    // API 설정 확인
    const isApiActive = await checkApiSettings();
    
    if (!isApiActive) {
      console.log('API가 비활성화되어 있습니다. 기사 수집을 건너뜁니다.');
      return { success: true, skipped: true, message: 'API가 비활성화되어 있습니다.' };
    }
    
    // 1. 네이버 API를 통해 기사 수집 (단독 기사만)
    const rawArticles = await fetchMultipleKeywords(KEYWORDS, 20);
    console.log(`총 ${rawArticles.length}개의 단독 기사를 수집했습니다.`);
    
    // 수집된 기사가 없는 경우
    if (rawArticles.length === 0) {
      console.log('수집된 단독 기사가 없습니다.');
      return { success: true, count: 0 };
    }
    
    // 2. 기사 데이터 정제
    const cleanedArticles = rawArticles.map(cleanArticleData);
    
    // 3. AI를 사용하여 기사 카테고리 분류
    const classifiedArticles = await batchClassifyArticles(cleanedArticles);
    console.log('기사 카테고리 분류 완료');
    
    // 4. Supabase 데이터베이스에 저장
    const savePromises = classifiedArticles.map(article => saveArticle(article));
    await Promise.all(savePromises);
    
    console.log('기사 저장 완료');
    return { success: true, count: classifiedArticles.length };
  } catch (error) {
    console.error('기사 수집 및 저장 중 오류 발생:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Vercel Serverless Function 핸들러
 */
export default async function handler(req, res) {
  // API 키 검증 (보안을 위해)
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.CRON_API_KEY;
  
  // Vercel Cron에서 호출된 경우 또는 유효한 API 키가 제공된 경우에만 실행
  if (req.headers['x-vercel-cron'] === 'true' || apiKey === validApiKey) {
    try {
      const result = await collectAndSaveNews();
      res.status(200).json(result);
    } catch (error) {
      console.error('서버리스 함수 실행 중 오류 발생:', error);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  } else {
    res.status(401).json({ error: '인증되지 않은 요청입니다.' });
  }
}

// Vercel Cron 설정
export const config = {
  schedule: '*/5 * * * *' // 5분마다 실행
}; 