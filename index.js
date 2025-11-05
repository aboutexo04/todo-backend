// Todo Backend API Server
import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import cors from 'cors';
import todosRouter from './routers/todos.js';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003;

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'todo_db';

let db = null;
let mongoClient = null;
let isConnecting = false; // 연결 시도 중 플래그

// CORS 설정 - 프론트엔드에서의 요청 허용 (개발 환경: 모든 localhost 포트 허용)
app.use(cors({
    origin: (origin, callback) => {
        // 개발 환경: localhost에서 오는 모든 요청 허용
        // origin이 없는 경우도 허용 (같은 origin 또는 서버 간 통신)
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            callback(null, true);
        } else {
            callback(null, true); // 개발 환경에서는 모든 origin 허용
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// JSON 미들웨어
app.use(express.json());

// 요청 로깅 미들웨어 (개발 환경에서만)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
        next();
    });
}

// DB 접근을 위한 미들웨어 (연결이 없으면 재연결 시도)
app.use(async (req, res, next) => {
    if (!db && !isConnecting) {
        // DB가 없고 연결 시도 중이 아니면 재연결 시도
        if (process.env.NODE_ENV !== 'production') {
            console.log('⚠️ DB 연결이 없습니다. 재연결 시도 중...');
        }
        await connectToMongoDB();
    }
    req.db = db;
    next();
});

// 라우터 연결
app.use('/todos', todosRouter);
app.use('/api/todos', todosRouter); // 프론트엔드 호환성을 위한 추가 경로
app.use('/api/v1/todos', todosRouter); // 프론트엔드 호환성을 위한 추가 경로

// MongoDB 연결 함수
async function connectToMongoDB() {
    // 이미 연결 중이면 기다림
    if (isConnecting) {
        return false;
    }
    
    try {
        isConnecting = true;
        if (process.env.NODE_ENV !== 'production') {
            console.log('MongoDB 연결 시도 중...');
        }
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        db = mongoClient.db(DB_NAME);
        if (process.env.NODE_ENV !== 'production') {
            console.log('연결성공!');
        }
        isConnecting = false;
        return true;
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error.message);
        isConnecting = false;
        return false;
    }
}

// MongoDB 연결 해제 함수
async function disconnectFromMongoDB() {
    try {
        if (mongoClient) {
            await mongoClient.close();
            console.log('MongoDB 연결 종료');
        }
    } catch (error) {
        console.error('MongoDB 연결 해제 오류:', error.message);
    }
}

// 서버 재시작 함수 (개발 환경에서만 사용)
function restartServer() {
    if (process.env.NODE_ENV === 'production') {
        // 프로덕션 환경에서는 서버를 종료하지 않고 재연결만 시도
        console.log('⚠️ MongoDB 연결 실패. 재연결 시도 중...');
        reconnectToMongoDB();
        return;
    }
    console.log('서버 재시작 중...');
    setTimeout(async () => {
        await disconnectFromMongoDB();
        process.exit(1); // 프로세스 종료 (외부 프로세스 매니저가 재시작)
    }, 1000);
}

// MongoDB 연결 상태 확인 및 재연결
async function checkConnection() {
    try {
        if (!db) {
            return false;
        }
        await db.admin().ping();
        return true;
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('MongoDB 연결 상태 확인 실패:', error.message);
        }
        return false;
    }
}

// MongoDB 재연결 시도
async function reconnectToMongoDB() {
    if (process.env.NODE_ENV !== 'production') {
        console.log('MongoDB 재연결 시도...');
    }
    const connected = await connectToMongoDB();
    if (!connected) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('재연결 실패. 서버 재시작 예정...');
        }
        restartServer();
    }
}

// 주기적으로 연결 상태 확인 (프로덕션에서는 60초마다, 개발에서는 30초마다)
const checkInterval = process.env.NODE_ENV === 'production' ? 60000 : 30000;
setInterval(async () => {
    if (!await checkConnection()) {
        await reconnectToMongoDB();
    }
}, checkInterval);

// 기본 라우트
app.get('/', (req, res) => {
    res.json({
        message: 'Todo Backend API Server',
        status: 'running',
        mongodb: db ? 'connected' : 'disconnected'
    });
});

// Health check 엔드포인트
app.get('/health', async (req, res) => {
    const dbStatus = await checkConnection();
    res.json({
        status: dbStatus ? 'healthy' : 'unhealthy',
        mongodb: dbStatus ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});


// 서버 시작
async function startServer() {
    // MongoDB 연결 시도
    const connected = await connectToMongoDB();
    
    if (!connected) {
        if (process.env.NODE_ENV !== 'production') {
            console.log('⚠️ MongoDB 초기 연결 실패. 백그라운드에서 재시도 중...');
        }
        // 백그라운드에서 주기적으로 재연결 시도 (프로덕션에서는 30초마다)
        const reconnectInterval = process.env.NODE_ENV === 'production' ? 30000 : 10000;
        const reconnectTimer = setInterval(async () => {
            const reconnected = await connectToMongoDB();
            if (reconnected) {
                if (process.env.NODE_ENV !== 'production') {
                    console.log('✅ MongoDB 재연결 성공!');
                }
                clearInterval(reconnectTimer);
            }
        }, reconnectInterval);
    } else {
        if (process.env.NODE_ENV !== 'production') {
            console.log('✅ MongoDB 연결 성공!');
        }
    }

    // 서버 시작
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        if (process.env.NODE_ENV !== 'production') {
            console.log(`📊 MongoDB: ${MONGODB_URI}/${DB_NAME}`);
        }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM 신호 받음. 서버 종료 중...');
        server.close(async () => {
            await disconnectFromMongoDB();
            process.exit(0);
        });
    });

    process.on('SIGINT', async () => {
        console.log('\nSIGINT 신호 받음. 서버 종료 중...');
        server.close(async () => {
            await disconnectFromMongoDB();
            process.exit(0);
        });
    });
}

// 에러 핸들링
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    // MongoDB 연결 오류인 경우 재연결 시도 (프로덕션에서는 서버 종료하지 않음)
    if (error.message && error.message.includes('Mongo')) {
        console.log('⚠️ MongoDB 연결 오류 감지. 재연결 시도 중...');
        reconnectToMongoDB();
    }
});

// 서버 시작
startServer();

