import { supabase } from '../../../lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-jwt';

// 관리자 인증 미들웨어
const authenticateAdmin = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new Error('인증 토큰이 없습니다.');
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('인증에 실패했습니다.');
  }
};

/**
 * 사용자 관리 엔드포인트
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // 관리자 인증
    let admin;
    try {
      admin = authenticateAdmin(req);
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
    
    // GET 요청 처리 (사용자 목록 조회)
    if (req.method === 'GET') {
      const { page = 1, pageSize = 20 } = req.query;
      
      // 페이지 및 페이지 크기를 숫자로 변환
      const pageNum = parseInt(page, 10);
      const pageSizeNum = parseInt(pageSize, 10);
      
      // 유효성 검사
      if (isNaN(pageNum) || isNaN(pageSizeNum) || pageNum < 1 || pageSizeNum < 1 || pageSizeNum > 100) {
        return res.status(400).json({ error: '유효하지 않은 페이지 파라미터입니다.' });
      }
      
      // 페이지네이션 계산
      const from = (pageNum - 1) * pageSizeNum;
      const to = from + pageSizeNum - 1;
      
      // 사용자 목록 조회
      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      return res.status(200).json({
        success: true,
        users: data,
        pagination: {
          total: count,
          page: pageNum,
          pageSize: pageSizeNum,
          totalPages: Math.ceil(count / pageSizeNum)
        }
      });
    }
    
    // DELETE 요청 처리 (사용자 삭제)
    if (req.method === 'DELETE') {
      // 슈퍼 관리자 권한 확인
      if (!admin.isSuperAdmin) {
        return res.status(403).json({ error: '이 작업을 수행할 권한이 없습니다.' });
      }
      
      const { email } = req.query;
      
      if (!email) {
        return res.status(400).json({ error: '사용자 이메일은 필수 항목입니다.' });
      }
      
      // 사용자 삭제
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('email', email);
      
      if (error) throw error;
      
      return res.status(200).json({
        success: true,
        message: '사용자가 성공적으로 삭제되었습니다.'
      });
    }
    
    // 지원하지 않는 메서드
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  } catch (error) {
    console.error('사용자 관리 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
} 