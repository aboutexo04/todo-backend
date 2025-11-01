// Todo 컬렉션 스키마 정의

/**
 * Todo 스키마 구조
 * 
 * @typedef {Object} Todo
 * @property {string} _id - MongoDB 자동 생성 ID
 * @property {string} title - 할일 제목 (필수)
 * @property {string} [description] - 할일 설명 (선택)
 * @property {boolean} completed - 완료 여부 (기본값: false)
 * @property {string} priority - 우선순위: 'high', 'medium', 'low' (기본값: 'medium')
 * @property {Date} createdAt - 생성 일시
 * @property {Date} updatedAt - 수정 일시
 */

/**
 * Todo 컬렉션 초기화 및 인덱스 생성
 * @param {Object} db - MongoDB 데이터베이스 객체
 * @returns {Object} Todo 컬렉션 객체
 */
export async function initializeTodoCollection(db) {
    const collectionName = 'todos';
    const collection = db.collection(collectionName);

    // 인덱스 생성
    try {
        // createdAt으로 정렬을 위한 인덱스
        await collection.createIndex({ createdAt: -1 });

        // completed 상태로 필터링을 위한 인덱스
        await collection.createIndex({ completed: 1 });

        // priority로 정렬을 위한 인덱스
        await collection.createIndex({ priority: 1 });

        console.log(`✅ ${collectionName} 컬렉션 인덱스 생성 완료`);
    } catch (error) {
        console.error(`인덱스 생성 오류: ${error.message}`);
    }

    return collection;
}

/**
 * Todo 데이터 검증
 * @param {Object} todoData - 검증할 Todo 데이터
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateTodo(todoData) {
    if (!todoData.title || typeof todoData.title !== 'string' || todoData.title.trim().length === 0) {
        return { valid: false, error: '할일 제목은 필수입니다.' };
    }

    if (todoData.title.length > 200) {
        return { valid: false, error: '할일 제목은 200자 이하여야 합니다.' };
    }

    if (todoData.description && todoData.description.length > 1000) {
        return { valid: false, error: '할일 설명은 1000자 이하여야 합니다.' };
    }

    if (todoData.priority && !['high', 'medium', 'low'].includes(todoData.priority)) {
        return { valid: false, error: '우선순위는 high, medium, low 중 하나여야 합니다.' };
    }

    return { valid: true };
}

/**
 * 새로운 Todo 객체 생성
 * @param {Object} data - Todo 데이터
 * @returns {Object} Todo 객체
 */
export function createTodo(data) {
    const now = new Date();

    return {
        title: data.title.trim(),
        description: data.description?.trim() || '',
        completed: data.completed || false,
        priority: data.priority || 'medium',
        createdAt: now,
        updatedAt: now
    };
}

