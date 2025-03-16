import { getCategories } from '../../lib/supabase';

/**
 * 기사 카테고리 목록을 조회하는 API 엔드포인트
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
    console.log('카테고리 목록 조회 요청');
    
    // 카테고리 조회
    const categories = await getCategories();
    
    // 기본 카테고리 목록 (데이터베이스에서 조회된 카테고리가 없는 경우 사용)
    const defaultCategories = [
      { name: '정치', count: 0 },
      { name: '경제', count: 0 },
      { name: '사회', count: 0 },
      { name: '국제', count: 0 },
      { name: '문화', count: 0 },
      { name: '스포츠', count: 0 },
      { name: 'IT/과학', count: 0 },
      { name: '기타', count: 0 }
    ];
    
    // 카테고리가 없는 경우 기본 카테고리 반환
    if (!categories || categories.length === 0) {
      console.log('데이터베이스에서 카테고리를 찾을 수 없어 기본 카테고리를 반환합니다.');
      return res.status(200).json({ categories: defaultCategories });
    }
    
    // 응답 반환
    res.status(200).json({ categories });
  } catch (error) {
    console.error('카테고리 조회 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
