import supabase from '../../lib/supabase.new';

/**
 * 기사 통계를 조회하는 API 엔드포인트
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
    console.log('기사 통계 조회 요청');
    
    // 통계 데이터 수집
    const stats = await collectStats();
    
    // 응답 반환
    res.status(200).json({ stats });
  } catch (error) {
    console.error('통계 조회 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

/**
 * 기사 통계를 수집하는 함수
 * @returns {Promise<Object>} 통계 데이터
 */
async function collectStats() {
  try {
    // 기본 통계 객체
    const stats = {
      totalArticles: 0,
      totalViews: 0,
      categoryCounts: [],
      topArticles: [],
      latestArticles: [],
      dailyArticleCounts: []
    };
    
    // 1. 총 기사 수 및 조회수 조회
    const { data: countData, error: countError } = await supabase
      .from('articles')
      .select('views');
    
    if (!countError && countData) {
      stats.totalArticles = countData.length;
      stats.totalViews = countData.reduce((sum, article) => sum + (article.views || 0), 0);
    }
    
    // 2. 카테고리별 기사 수 조회
    const { data: categoryData, error: categoryError } = await supabase.rpc('get_category_counts');
    
    if (!categoryError && categoryData) {
      stats.categoryCounts = categoryData;
    } else {
      // 대체 방법: 직접 카테고리 집계
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('category');
      
      if (!articlesError && articles) {
        const categoryCounts = {};
        articles.forEach(article => {
          const category = article.category || '기타';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
        
        stats.categoryCounts = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }));
      }
    }
    
    // 3. 인기 기사 조회 (조회수 기준 상위 5개)
    const { data: topArticlesData, error: topArticlesError } = await supabase
      .from('articles')
      .select('id, title, views, category, pub_date')
      .order('views', { ascending: false })
      .limit(5);
    
    if (!topArticlesError && topArticlesData) {
      stats.topArticles = topArticlesData;
    }
    
    // 4. 최신 기사 조회 (최근 5개)
    const { data: latestArticlesData, error: latestArticlesError } = await supabase
      .from('articles')
      .select('id, title, pub_date, category')
      .order('pub_date', { ascending: false })
      .limit(5);
    
    if (!latestArticlesError && latestArticlesData) {
      stats.latestArticles = latestArticlesData;
    }
    
    // 5. 일별 기사 수 조회 (최근 7일)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: dailyData, error: dailyError } = await supabase
      .from('articles')
      .select('pub_date')
      .gte('pub_date', sevenDaysAgo.toISOString());
    
    if (!dailyError && dailyData) {
      // 일별 기사 수 집계
      const dailyCounts = {};
      
      // 최근 7일 날짜 초기화
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        dailyCounts[dateString] = 0;
      }
      
      // 기사 날짜별 집계
      dailyData.forEach(article => {
        const dateString = article.pub_date.split('T')[0];
        if (dailyCounts[dateString] !== undefined) {
          dailyCounts[dateString]++;
        }
      });
      
      // 결과 형식 변환 및 날짜순 정렬
      stats.dailyArticleCounts = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    
    return stats;
  } catch (error) {
    console.error('통계 수집 중 오류 발생:', error);
    return {
      totalArticles: 0,
      totalViews: 0,
      categoryCounts: [],
      topArticles: [],
      latestArticles: [],
      dailyArticleCounts: []
    };
  }
}
