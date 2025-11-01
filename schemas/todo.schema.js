// Todo 컬렉션 스키마 정의

export const TodoSchema = {
    // 컬렉션 이름
    collectionName: 'todos',

    // 필드 정의
    fields: {
        // 할일 제목 (필수)
        title: {
            type: String,
            required: true,
            maxLength: 200
        },

        // 할일 설명 (선택)
        description: {
            type: String,
            required: false,
            maxLength: 1000
        },

        // 완료 여부 (기본값: false)
        completed: {
            type: Boolean,
            required: true,
            default: false
        },

        // 생성 일시 (자동 생성)
        createdAt: {
            type: Date,
            required: true,
            default: Date.now
        },

        // 수정 일시 (자동 업데이트)
        updatedAt: {
            type: Date,
            required: true,
            default: Date.now
        },

        // 우선순위 (선택, 낮음/보통/높음)
        priority: {
            type: String,
            required: false,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        },

        // 마감일 (선택)
        dueDate: {
            type: Date,
            required: false
        },

        // 태그 (선택, 배열)
        tags: {
            type: Array,
            required: false,
            default: []
        }
    },

    // 인덱스 정의
    indexes: [
        { fields: { createdAt: -1 } }, // 생성일 기준 내림차순
        { fields: { completed: 1 } },  // 완료 여부
        { fields: { priority: 1 } }   // 우선순위
    ]
};

// 실제 MongoDB 문서 예시
export const TodoDocumentExample = {
    _id: "ObjectId()", // MongoDB에서 자동 생성
    title: "할일 예시",
    description: "이것은 할일 설명입니다",
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    priority: "medium",
    dueDate: null,
    tags: []
};

