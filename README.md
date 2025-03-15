# Naver News Collector

네이버 API를 통해 기사를 수집하고 Supabase에 저장하는 서버리스 애플리케이션입니다.

## 기술 스택

- Next.js 14
- Node.js 20.x
- Supabase
- Naver News API

## 환경 설정

프로젝트를 실행하기 위해 다음 환경 변수가 필요합니다:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 개발 환경 실행

```bash
npm install
npm run dev
```

## 주요 기능

- 네이버 API 호출을 통해 기사 목록 수집
- 기사 데이터를 Supabase 데이터베이스에 저장 (중복 데이터 처리)
- Supabase 데이터베이스에서 저장된 기사 데이터 조회
- AI(클로드 소넷 3.5)를 활용한 기사 카테고리 자동 분류
- 사용자 피드백 수집 기능
- 사용자 이용 통계 수집 및 분석 기능
- 이메일 주소 기반 사용자 인증 기능

## 설치 및 실행 방법

### 사전 준비

1. [Supabase](https://supabase.io/) 계정 생성 및 프로젝트 설정
2. [네이버 개발자 센터](https://developers.naver.com/main/) 애플리케이션 등록 및 API 키 발급
3. [Anthropic](https://www.anthropic.com/) API 키 발급
4. [Vercel](https://vercel.com/) 계정 생성

### 로컬 개발 환경 설정

1. 저장소 클론
   ```bash
   git clone <repository-url>
   cd naver-news-collector
   ```

2. 의존성 설치
   ```bash
   npm install
   ```

3. 환경 변수 설정
   ```bash
   cp .env.local.example .env.local
   ```
   `.env.local` 파일을 열고 필요한 API 키와 설정값을 입력합니다.

4. Supabase 데이터베이스 테이블 생성
   Supabase 대시보드에서 `supabase/migrations/create_tables.sql` 파일의 내용을 실행하여 필요한 테이블을 생성합니다.

5. 개발 서버 실행
   ```bash
   npm run dev
   ```
   브라우저에서 `http://localhost:3000`으로 접속하여 애플리케이션을 확인합니다.

### Vercel 배포

1. GitHub 저장소에 코드 푸시

2. Vercel에서 새 프로젝트 생성
   - GitHub 저장소 연결
   - 환경 변수 설정 (`.env.local`의 내용과 동일하게 설정)

3. Vercel Cron Jobs 설정
   - Vercel 대시보드에서 Cron Jobs 활성화
   - `/api/cron/collect-news` 엔드포인트를 5분마다 실행하도록 설정

## 프로젝트 구조

```
├── api/                  # API 엔드포인트
│   ├── articles.js       # 기사 조회 API
│   ├── auth.js           # 사용자 인증 API
│   ├── feedback.js       # 피드백 저장 API
│   └── cron/             # Cron Jobs
│       └── collect-news.js  # 기사 수집 작업
├── components/           # React 컴포넌트
│   ├── ArticleList.js    # 기사 목록 컴포넌트
│   ├── AuthForm.js       # 인증 폼 컴포넌트
│   ├── CategoryFilter.js # 카테고리 필터 컴포넌트
│   ├── FeedbackForm.js   # 피드백 폼 컴포넌트
│   └── Pagination.js     # 페이지네이션 컴포넌트
├── lib/                  # 유틸리티 함수
│   ├── aiClassifier.js   # AI 기사 분류 기능
│   ├── naverApi.js       # 네이버 API 호출 기능
│   └── supabase.js       # Supabase 클라이언트 및 함수
├── pages/                # Next.js 페이지
│   └── index.js          # 메인 페이지
├── public/               # 정적 파일
├── styles/               # 스타일 파일
├── supabase/             # Supabase 관련 파일
│   └── migrations/       # 데이터베이스 마이그레이션
│       └── create_tables.sql  # 테이블 생성 SQL
├── .env.local.example    # 환경 변수 예제 파일
├── package.json          # 프로젝트 의존성 및 스크립트
└── README.md             # 프로젝트 설명
```

## 라이선스

MIT

## 기여 방법

1. 이슈 등록 또는 기능 제안
2. 포크 및 브랜치 생성
3. 코드 변경 및 테스트
4. Pull Request 제출 