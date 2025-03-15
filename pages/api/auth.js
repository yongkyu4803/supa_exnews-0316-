import { supabase, registerUser, logUserAction } from '../../lib/supabase';

/**
 * 사용자 인증을 처리하는 API 엔드포인트
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
    const { email, username, action } = req.body;
    
    // 이메일 필수 검증
    if (!email) {
      return res.status(400).json({ error: '이메일은 필수 항목입니다.' });
    }
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '유효하지 않은 이메일 형식입니다.' });
    }
    
    // 액션에 따른 처리
    switch (action) {
      case 'signup':
        // 회원가입 처리
        if (!username) {
          return res.status(400).json({ error: '사용자 이름은 필수 항목입니다.' });
        }
        
        // 사용자 등록
        await registerUser(email, username);
        
        // 매직 링크 이메일 발송
        const { error: signUpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          }
        });
        
        if (signUpError) throw signUpError;
        
        // 사용자 활동 로깅
        await logUserAction(email, 'signup');
        
        return res.status(200).json({ 
          success: true, 
          message: '가입 확인 이메일이 발송되었습니다. 이메일을 확인해주세요.' 
        });
        
      case 'signin':
        // 로그인 처리 (매직 링크 이메일 발송)
        const { error: signInError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
          }
        });
        
        if (signInError) throw signInError;
        
        // 사용자 활동 로깅
        await logUserAction(email, 'signin');
        
        return res.status(200).json({ 
          success: true, 
          message: '로그인 링크가 이메일로 발송되었습니다. 이메일을 확인해주세요.' 
        });
        
      default:
        return res.status(400).json({ error: '유효하지 않은 액션입니다.' });
    }
  } catch (error) {
    console.error('인증 처리 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
} 