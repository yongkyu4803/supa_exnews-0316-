/**
 * 네이버 뉴스 검색 API를 안전하게 호출하기 위한 프록시 API
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
  
  // 쿼리 파라미터 추출
  const { query = '[단독]', display = 100, start = 1, sort = 'date' } = req.query;
  
  // 환경 변수 확인
  const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
  
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.error('네이버 API 키가 설정되지 않았습니다.');
    return res.status(500).json({ error: '서버 설정 오류: 네이버 API 키가 설정되지 않았습니다.' });
  }
  
  try {
    console.log(`네이버 뉴스 API 호출: query="${query}", display=${display}, start=${start}, sort=${sort}`);
    
    // 네이버 API 호출
    const response = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&start=${start}&sort=${sort}`, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('네이버 API 응답 오류:', response.status, errorText);
      return res.status(response.status).json({ 
        error: '네이버 API 응답 오류', 
        status: response.status,
        details: errorText
      });
    }
    
    const data = await response.json();
    console.log('API 응답 메타데이터:', {
      total: data.total,
      start: data.start,
      display: data.display,
      lastBuildDate: data.lastBuildDate,
      itemCount: data.items?.length || 0
    });
    
    // 응답 반환
    return res.status(200).json(data);
  } catch (error) {
    console.error('네이버 API 호출 중 오류 발생:', error);
    return res.status(500).json({ 
      error: '네이버 API 호출 오류', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
