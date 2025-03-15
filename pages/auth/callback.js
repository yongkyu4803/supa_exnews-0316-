import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // URL에서 해시 파라미터 처리
    const handleAuthCallback = async () => {
      try {
        // 현재 URL에서 해시 파라미터 가져오기
        const hashParams = window.location.hash;
        
        if (hashParams) {
          // Supabase 세션 설정
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('인증 콜백 처리 중 오류 발생:', error);
            alert('로그인 처리 중 오류가 발생했습니다.');
          } else {
            console.log('인증 성공:', data);
          }
        }
        
        // 인증 처리 후 메인 페이지로 리디렉션
        router.push('/');
      } catch (error) {
        console.error('인증 콜백 처리 중 예외 발생:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
        router.push('/');
      }
    };

    // 페이지 로드 시 인증 콜백 처리
    handleAuthCallback();
  }, [router]);

  return (
    <div className="auth-callback">
      <h2>인증 처리 중...</h2>
      <p>잠시만 기다려주세요. 자동으로 메인 페이지로 이동합니다.</p>
      
      <style jsx>{`
        .auth-callback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          padding: 0 1rem;
        }
        
        h2 {
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        
        p {
          color: #666;
        }
      `}</style>
    </div>
  );
} 