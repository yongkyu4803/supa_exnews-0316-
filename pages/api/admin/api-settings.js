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
 * API 설정 관리 엔드포인트
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
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
    
    // 슈퍼 관리자 권한 확인
    if (!admin.isSuperAdmin) {
      return res.status(403).json({ error: '이 작업을 수행할 권한이 없습니다.' });
    }
    
    // GET 요청 처리 (API 설정 조회)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('api_settings')
        .select('*')
        .order('api_name');
      
      if (error) throw error;
      
      return res.status(200).json({ success: true, settings: data });
    }
    
    // PUT 요청 처리 (API 설정 업데이트)
    if (req.method === 'PUT') {
      const { apiName, isActive, runInterval } = req.body;
      
      // 필수 필드 검증
      if (!apiName) {
        return res.status(400).json({ error: 'API 이름은 필수 항목입니다.' });
      }
      
      // 업데이트할 데이터 준비
      const updateData = {
        updated_at: new Date()
      };
      
      if (isActive !== undefined) {
        updateData.is_active = isActive;
      }
      
      if (runInterval !== undefined) {
        updateData.run_interval = runInterval;
      }
      
      // API 설정 업데이트
      const { data, error } = await supabase
        .from('api_settings')
        .update(updateData)
        .eq('api_name', apiName)
        .select()
        .single();
      
      if (error) throw error;
      
      return res.status(200).json({ 
        success: true, 
        message: 'API 설정이 업데이트되었습니다.',
        setting: data
      });
    }
    
    // 지원하지 않는 메서드
    return res.status(405).json({ error: '허용되지 않는 메서드입니다.' });
  } catch (error) {
    console.error('API 설정 관리 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
} 