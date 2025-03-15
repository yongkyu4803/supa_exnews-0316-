import { saveFeedback, logUserAction } from '../../lib/supabase';

/**
 * 사용자 피드백을 저장하는 API 엔드포인트
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // POST 요청만 처리
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  }
  
  try {
    const { articleId, userEmail, userComment } = req.body;
    
    // 필수 필드 검증
    if (!articleId || !userEmail) {
      return res.status(400).json({ error: '기사 ID와 사용자 이메일은 필수 항목입니다.' });
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: '유효하지 않은 이메일 형식입니다.' });
    }
    
    // 피드백 저장
    await saveFeedback({
      articleId,
      userEmail,
      userComment: userComment || ''
    });
    
    // 사용자 활동 로깅
    await logUserAction(userEmail, 'submit_feedback');
    
    // 응답 반환
    res.status(201).json({ success: true, message: '피드백이 성공적으로 저장되었습니다.' });
  } catch (error) {
    console.error('피드백 저장 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
} 