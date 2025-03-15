import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 환경 변수가 없는 경우 오류 발생
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL 또는 Anon Key가 설정되지 않았습니다. 환경 변수를 확인하세요.');
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 기사 데이터 저장 함수
export async function saveArticle(article) {
  try {
    // ID가 UUID 형식인지 확인
    if (!isValidUUID(article.id)) {
      console.log(`ID가 UUID 형식이 아닙니다: ${article.id}. 새 UUID를 생성합니다.`);
      article.id = generateUUID();
    }
    
    // 먼저 기존 기사가 있는지 확인 (ID로 검색)
    const { data: existingArticleById, error: fetchErrorById } = await supabase
      .from('articles')
      .select('*')
      .eq('id', article.id)
      .maybeSingle();

    if (fetchErrorById) {
      console.error('ID로 기존 기사 확인 중 오류 발생:', fetchErrorById);
    }

    // 링크로 검색
    const { data: existingArticleByLink, error: fetchErrorByLink } = await supabase
      .from('articles')
      .select('*')
      .eq('link', article.link)
      .maybeSingle();

    if (fetchErrorByLink) {
      console.error('링크로 기존 기사 확인 중 오류 발생:', fetchErrorByLink);
    }

    // 둘 중 하나라도 있으면 기존 기사로 간주
    const existingArticle = existingArticleById || existingArticleByLink;

    // 기존 기사가 있고, 내용이 동일하면 업데이트하지 않음
    if (existingArticle) {
      // 기사 내용이 변경되었는지 확인 (제목이나 설명이 변경된 경우에만 업데이트)
      const contentChanged = 
        existingArticle.title !== article.title || 
        existingArticle.description !== article.description;
      
      if (!contentChanged) {
        console.log('기존 기사와 내용이 동일하여 업데이트하지 않습니다:', article.title);
        return existingArticle;
      }
      
      console.log('기존 기사의 내용이 변경되어 업데이트합니다:', article.title);
      
      // 기존 기사의 ID 사용
      article.id = existingArticle.id;
    }

    // 새 기사이거나 내용이 변경된 경우 저장/업데이트
    const { data, error } = await supabase
      .from('articles')
      .upsert(
        {
          id: article.id,
          title: article.title,
          originallink: article.originallink,
          link: article.link,
          description: article.description,
          pubdate: article.pubDate,
          category: article.category,
          updated_at: new Date()
        },
        { 
          onConflict: 'id', 
          ignoreDuplicates: false 
        }
      );

    if (error) throw error;
    return data || existingArticle;
  } catch (error) {
    console.error('기사 저장 중 오류 발생:', error);
    throw error;
  }
}

/**
 * UUID v4를 생성합니다.
 * @returns {string} - UUID v4 형식의 문자열
 */
function generateUUID() {
  // UUID v4 형식: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // 여기서 x는 랜덤 16진수, y는 8, 9, A, B 중 하나
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 문자열이 유효한 UUID 형식인지 확인합니다.
 * @param {string} uuid - 확인할 문자열
 * @returns {boolean} - UUID 형식이면 true, 아니면 false
 */
function isValidUUID(uuid) {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// 기사 목록 조회 함수
export async function getArticles({ page = 1, pageSize = 10, category = null }) {
  try {
    let query = supabase
      .from('articles')
      .select('*')
      .order('pubdate', { ascending: false });

    // 카테고리 필터링
    if (category) {
      query = query.eq('category', category);
    }

    // 페이지네이션
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data, count };
  } catch (error) {
    console.error('기사 조회 중 오류 발생:', error);
    throw error;
  }
}

// 사용자 피드백 저장 함수
export async function saveFeedback(feedback) {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        article_id: feedback.articleId,
        user_email: feedback.userEmail,
        user_comment: feedback.userComment
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('피드백 저장 중 오류 발생:', error);
    throw error;
  }
}

// 사용자 활동 로깅 함수
export async function logUserAction(userEmail, action) {
  try {
    const { data, error } = await supabase
      .from('usage_stats')
      .insert({
        user_email: userEmail,
        action: action
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('사용자 활동 로깅 중 오류 발생:', error);
    throw error;
  }
}

// 사용자 등록 함수
export async function registerUser(email, username) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          email: email,
          username: username,
          created_at: new Date()
        },
        { onConflict: 'email' }
      );

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('사용자 등록 중 오류 발생:', error);
    throw error;
  }
} 