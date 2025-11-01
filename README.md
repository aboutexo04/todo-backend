# Todo Backend

Todo 앱의 백엔드 서버입니다.

## 설치

```bash
npm install
```

## 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=todo_db
PORT=3000
```

또는 MongoDB Atlas를 사용하는 경우:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=todo_db
PORT=3000
```

## 실행

```bash
# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

## 기능

- ✅ MongoDB 자동 연결 및 재연결
- ✅ 연결 상태 주기적 확인 (30초마다)
- ✅ 연결 실패 시 자동 서버 재시작
- ✅ Graceful shutdown 지원
- ✅ Health check 엔드포인트 (`/health`)

## API 엔드포인트

- `GET /` - 서버 상태 확인
- `GET /health` - 건강 상태 확인 (MongoDB 연결 상태 포함)

