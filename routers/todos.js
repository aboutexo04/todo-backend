// 할일 라우터
import express from 'express';
import { ObjectId } from 'mongodb';

const router = express.Router();

// 모든 할일 조회 라우터
router.get('/', async (req, res) => {
    try {
        // 데이터베이스 연결 확인
        const db = req.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: '데이터베이스 연결이 없습니다.'
            });
        }

        // 쿼리 파라미터에서 필터 옵션 추출
        const { completed, priority, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // 필터 조건 생성
        const filter = {};
        if (completed !== undefined) {
            filter.completed = completed === 'true';
        }
        if (priority && ['low', 'medium', 'high'].includes(priority)) {
            filter.priority = priority;
        }

        // todos 컬렉션에서 조회
        const todosCollection = db.collection('todos');
        const todos = await todosCollection
            .find(filter)
            .sort({ createdAt: -1 }) // 최신순 정렬
            .skip(skip)
            .limit(limitNum)
            .toArray();

        // 전체 개수 조회
        const totalCount = await todosCollection.countDocuments(filter);

        res.json({
            success: true,
            message: '할일 목록을 조회했습니다.',
            data: todos,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitNum)
            }
        });

    } catch (error) {
        console.error('할일 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '할일 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 특정 할일 조회 라우터
router.get('/:id', async (req, res) => {
    try {
        // 데이터베이스 연결 확인
        const db = req.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: '데이터베이스 연결이 없습니다.'
            });
        }

        // ID 파라미터 추출
        const { id } = req.params;

        // ObjectId 유효성 검증
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 ID 형식입니다.'
            });
        }

        // todos 컬렉션에서 조회
        const todosCollection = db.collection('todos');
        const todo = await todosCollection.findOne({ _id: new ObjectId(id) });

        // 할일이 없는 경우
        if (!todo) {
            return res.status(404).json({
                success: false,
                message: '할일을 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            message: '할일을 조회했습니다.',
            data: todo
        });

    } catch (error) {
        console.error('할일 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '할일 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 할일 생성 라우터
router.post('/', async (req, res) => {
    try {
        // 데이터베이스 연결 확인
        const db = req.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: '데이터베이스 연결이 없습니다.'
            });
        }

        // 요청 본문에서 데이터 추출
        const { title, description, priority, dueDate, tags } = req.body;

        // 필수 필드 검증
        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                message: '할일 제목은 필수입니다.'
            });
        }

        // 할일 데이터 생성
        const todo = {
            title: title.trim(),
            description: description ? description.trim() : null,
            completed: false,
            priority: priority && ['low', 'medium', 'high'].includes(priority)
                ? priority
                : 'medium',
            dueDate: dueDate ? new Date(dueDate) : null,
            tags: Array.isArray(tags) ? tags : [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // todos 컬렉션에 저장
        const todosCollection = db.collection('todos');
        const result = await todosCollection.insertOne(todo);

        // 생성된 할일 반환
        const createdTodo = {
            _id: result.insertedId,
            ...todo
        };

        res.status(201).json({
            success: true,
            message: '할일이 생성되었습니다.',
            data: createdTodo
        });

    } catch (error) {
        console.error('할일 생성 오류:', error);
        res.status(500).json({
            success: false,
            message: '할일 생성 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 할일 수정 라우터
router.put('/:id', async (req, res) => {
    try {
        // 데이터베이스 연결 확인
        const db = req.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: '데이터베이스 연결이 없습니다.'
            });
        }

        // ID 파라미터 추출
        const { id } = req.params;

        // ObjectId 유효성 검증
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 ID 형식입니다.'
            });
        }

        // 요청 본문에서 데이터 추출
        const { title, description, completed, priority, dueDate, tags } = req.body;

        // 할일 존재 확인
        const todosCollection = db.collection('todos');
        const existingTodo = await todosCollection.findOne({ _id: new ObjectId(id) });

        if (!existingTodo) {
            return res.status(404).json({
                success: false,
                message: '할일을 찾을 수 없습니다.'
            });
        }

        // 수정할 데이터 생성 (전달된 필드만 업데이트)
        const updateData = {
            updatedAt: new Date()
        };

        // 각 필드가 전달된 경우에만 업데이트
        if (title !== undefined) {
            if (!title || title.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: '할일 제목은 비어있을 수 없습니다.'
                });
            }
            updateData.title = title.trim();
        }

        if (description !== undefined) {
            updateData.description = description ? description.trim() : null;
        }

        if (completed !== undefined) {
            updateData.completed = completed === true || completed === 'true';
        }

        if (priority !== undefined) {
            if (priority && ['low', 'medium', 'high'].includes(priority)) {
                updateData.priority = priority;
            } else {
                return res.status(400).json({
                    success: false,
                    message: '우선순위는 low, medium, high 중 하나여야 합니다.'
                });
            }
        }

        if (dueDate !== undefined) {
            updateData.dueDate = dueDate ? new Date(dueDate) : null;
        }

        if (tags !== undefined) {
            updateData.tags = Array.isArray(tags) ? tags : [];
        }

        // 할일 업데이트
        const result = await todosCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '할일을 찾을 수 없습니다.'
            });
        }

        // 수정된 할일 조회
        const updatedTodo = await todosCollection.findOne({ _id: new ObjectId(id) });

        res.json({
            success: true,
            message: '할일이 수정되었습니다.',
            data: updatedTodo
        });

    } catch (error) {
        console.error('할일 수정 오류:', error);
        res.status(500).json({
            success: false,
            message: '할일 수정 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

// 할일 삭제 라우터
router.delete('/:id', async (req, res) => {
    try {
        // 데이터베이스 연결 확인
        const db = req.db;
        if (!db) {
            return res.status(500).json({
                success: false,
                message: '데이터베이스 연결이 없습니다.'
            });
        }

        // ID 파라미터 추출
        const { id } = req.params;

        // ObjectId 유효성 검증
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 ID 형식입니다.'
            });
        }

        // todos 컬렉션에서 삭제
        const todosCollection = db.collection('todos');
        const result = await todosCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: '할일을 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            message: '할일이 삭제되었습니다.',
            data: { id }
        });

    } catch (error) {
        console.error('할일 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '할일 삭제 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

export default router;

