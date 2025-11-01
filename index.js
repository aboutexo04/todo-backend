// Todo Backend API Server
import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import todosRouter from './routers/todos.js';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'todo_db';

let db = null;
let mongoClient = null;

// JSON 미들웨어
app.use(express.json());

// DB 접근을 위한 미들웨어
app.use((req, res, next) => {
    req.db = db;
    next();
});

// 라우터 연결
app.use('/todos', todosRouter);

// MongoDB 연결 함수
async function connectToMongoDB() {
    try {
        console.log('MongoDB 연결 시도 중...');
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        db = mongoClient.db(DB_NAME);
        console.log('연결성공!');
        return true;
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error.message);
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

// 서버 재시작 함수
function restartServer() {
    console.log('서버 재시작 중...');
    setTimeout(async () => {
        await disconnectFromMongoDB();
        process.exit(1); // 프로세스 종료 (외부 프로세스 매니저가 재시작)
    }, 1000);
}

// MongoDB 연결 상태 확인 및 재연결
async function checkConnection() {
    try {
        await db.admin().ping();
        return true;
    } catch (error) {
        console.error('MongoDB 연결 상태 확인 실패:', error.message);
        return false;
    }
}

// MongoDB 재연결 시도
async function reconnectToMongoDB() {
    console.log('MongoDB 재연결 시도...');
    const connected = await connectToMongoDB();
    if (!connected) {
        console.log('재연결 실패. 서버 재시작 예정...');
        restartServer();
    }
}

// 주기적으로 연결 상태 확인 (30초마다)
setInterval(async () => {
    if (!await checkConnection()) {
        await reconnectToMongoDB();
    }
}, 30000);

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
        console.log('MongoDB 연결 실패. 5초 후 재시작...');
        setTimeout(() => {
            restartServer();
        }, 5000);
        return;
    }

    // 서버 시작
    const server = app.listen(PORT, () => {
        console.log(`🚀 Server is running on http://localhost:${PORT}`);
        console.log(`📊 MongoDB: ${MONGODB_URI}/${DB_NAME}`);
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
    // MongoDB 연결 오류인 경우 재시작
    if (error.message.includes('Mongo')) {
        restartServer();
    }
});

// 서버 시작
startServer();

