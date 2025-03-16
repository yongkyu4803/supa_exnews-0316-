import { getArticleById, logUserAction, updateArticleViews } from '../../lib/supabase';

/**
 * 단일 기사를 조회하는 API 엔드포인트
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
  
  try {
    // 쿼리 파라미터 추출
    const { id, userEmail } = req.query;
    
    // ID 유효성 검사
    if (!id) {
      return res.status(400).json({ error: '기사 ID가 필요합니다.' });
    }
    
    console.log(`기사 ID ${id} 조회 요청`);
    
    // 기사 조회
    const article = await getArticleById(id);
    
    // 기사가 없는 경우
    if (!article) {
      console.log(`기사 ID ${id}를 찾을 수 없습니다.`);
      return res.status(404).json({ error: '기사를 찾을 수 없습니다.' });
    }
    
    // 조회수 업데이트 (비동기로 처리하고 응답을 기다리지 않음)
    updateArticleViews(id).catch(error => {
      console.error(`기사 ID ${id}의 조회수 업데이트 중 오류 발생:`, error);
    });
    
    // 사용자 활동 로깅 (선택적)
    if (userEmail) {
      logUserAction(userEmail, 'view_article', { articleId: id }).catch(error => {
        console.error('사용자 활동 로깅 중 오류 발생:', error);
      });
    }
    
    // 응답 반환
    res.status(200).json({ article });
  } catch (error) {
    console.error('기사 조회 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
