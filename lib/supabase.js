import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수 확인
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다.');
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 클라이언트가 제대로 생성되었는지 확인
if (!supabase || !supabase.auth) {
  console.error('Supabase 클라이언트 초기화 실패');
}

/**
 * 기사 목록을 조회하는 함수
 * @param {Object} options - 조회 옵션
 * @param {number} options.page - 페이지 번호 (1부터 시작)
 * @param {number} options.pageSize - 페이지당 항목 수
 * @param {string} options.category - 카테고리 필터 (선택적)
 * @returns {Promise<{data: Array, count: number}>} 기사 목록과 총 개수
 */
export async function getArticles({ page = 1, pageSize = 10, category = null }) {
  try {
    console.log(`기사 조회: 페이지=${page}, 페이지크기=${pageSize}, 카테고리=${category || '전체'}`);
    
    // 시작 인덱스 계산
    const startIndex = (page - 1) * pageSize;
    
    // 쿼리 빌더 초기화
    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .order('pubdate', { ascending: false });
    
    // 카테고리 필터 적용 (선택적)
    if (category) {
      query = query.eq('category', category);
    }
    
    // 페이지네이션 적용
    query = query.range(startIndex, startIndex + pageSize - 1);
    
    // 쿼리 실행
    const { data, error, count } = await query;
    
    // 오류 처리
    if (error) {
      console.error('기사 조회 중 Supabase 오류 발생:', error);
      throw error;
    }
    
    console.log(`${count || 0}개의 기사 중 ${data.length}개 조회 완료`);
    
    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('기사 조회 중 오류 발생:', error);
    return { data: [], count: 0 };
  }
}

/**
 * 기사 ID로 단일 기사를 조회하는 함수
 * @param {string} id - 기사 ID
 * @returns {Promise<Object|null>} 기사 객체 또는 null
 */
export async function getArticleById(id) {
  try {
    console.log(`기사 ID ${id} 조회 중`);
    
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`기사 ID ${id} 조회 중 Supabase 오류 발생:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`기사 ID ${id} 조회 중 오류 발생:`, error);
    return null;
  }
}

/**
 * 기사를 저장하는 함수 (새 기사 추가 또는 기존 기사 업데이트)
 * @param {Object} article - 저장할 기사 객체
 * @returns {Promise<string|null>} 저장된 기사 ID 또는 null
 */
export async function saveArticle(article) {
  try {
    if (!article || !article.id || !article.title) {
      console.error('유효하지 않은 기사 데이터:', article);
      return null;
    }
    
    // 기존 기사 확인
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id, link')
      .eq('id', article.id)
      .single();
    
    // 기존 기사가 있는 경우 업데이트, 없는 경우 새로 추가
    if (existingArticle) {
      console.log(`기존 기사 업데이트: ID=${article.id}, 제목=${article.title.substring(0, 30)}...`);
      
      const { data, error } = await supabase
        .from('articles')
        .update({
          title: article.title,
          description: article.description,
          pubdate: article.pubdate,
          category: article.category
        })
        .eq('id', article.id);
      
      if (error) {
        console.error(`기사 업데이트 중 Supabase 오류 발생: ID=${article.id}`, error);
        throw error;
      }
      
      return article.id;
    } else {
      console.log(`새 기사 추가: ID=${article.id}, 제목=${article.title.substring(0, 30)}...`);
      
      // 데이터베이스 스키마에 맞는 필드만 포함
      const newArticle = {
        id: article.id,
        title: article.title,
        description: article.description,
        link: article.link,
        originallink: article.originallink,
        pubdate: article.pubdate,
        category: article.category,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('articles')
        .insert([newArticle]);
      
      if (error) {
        console.error(`새 기사 추가 중 Supabase 오류 발생: ID=${article.id}`, error);
        throw error;
      }
      
      return article.id;
    }
  } catch (error) {
    console.error(`기사 저장 중 오류 발생: ID=${article?.id}`, error);
    throw error;
  }
}

/**
 * 기사 조회수를 업데이트하는 함수
 * @param {string} id - 기사 ID
 * @returns {Promise<boolean>} 성공 여부
 */
export async function updateArticleViews(id) {
  try {
    // views 컬럼이 없으므로 조회수 업데이트는 건너뜁니다.
    console.log(`기사 조회수 업데이트 건너뜀 (views 컬럼 없음): ID=${id}`);
    return true;
  } catch (error) {
    console.error(`기사 조회수 업데이트 중 오류 발생: ID=${id}`, error);
    return false;
  }
}

/**
 * 카테고리별 기사 수를 조회하는 함수
 * @returns {Promise<Array>} 카테고리 목록과 각 카테고리별 기사 수
 */
export async function getCategories() {
  try {
    console.log('카테고리별 기사 수 조회 중');
    
    // 모든 카테고리와 기사 수 조회
    const { data, error } = await supabase.rpc('get_category_counts');
    
    if (error) {
      console.error('카테고리 조회 중 Supabase 오류 발생:', error);
      
      // 대체 방법: 직접 카테고리 집계
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('category');
      
      if (articlesError) {
        console.error('기사 조회 중 Supabase 오류 발생:', articlesError);
        return [];
      }
      
      // 카테고리별 기사 수 집계
      const categoryCounts = {};
      articles.forEach(article => {
        const category = article.category || '기타';
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // 결과 형식 변환
      const result = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }));
      return result;
    }
    
    return data || [];
  } catch (error) {
    console.error('카테고리 조회 중 오류 발생:', error);
    return [];
  }
}

/**
 * 사용자 활동을 로깅하는 함수
 * @param {string} userEmail - 사용자 이메일
 * @param {string} action - 활동 유형 (예: 'view_article', 'view_articles')
 * @param {Object} metadata - 추가 메타데이터 (선택적)
 * @returns {Promise<boolean>} 성공 여부
 */
export async function logUserAction(userEmail, action, metadata = {}) {
  try {
    if (!userEmail || !action) {
      return false;
    }
    
    const { error } = await supabase
      .from('user_logs')
      .insert([
        {
          user_email: userEmail,
          action,
          metadata,
          created_at: new Date().toISOString()
        }
      ]);
    
    if (error) {
      console.error('사용자 활동 로깅 중 Supabase 오류 발생:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('사용자 활동 로깅 중 오류 발생:', error);
    return false;
  }
}
