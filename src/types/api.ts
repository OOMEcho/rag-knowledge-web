// 与后端 DTO 一一对应的类型定义，字段名和结构以后端 record 为准。

/** 后端统一响应结构（对应 ApiResponse<T>）；ID 类字段后端序列化为字符串，规避 JS Number 精度丢失 */
export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
  timestamp: string
}

/** 后端统一分页结构（对应 PageResponse<T>） */
export interface PageResponse<T> {
  records: T[]
  total: number
  pageNum: number
  pageSize: number
}

/** 知识库（对应 KnowledgeBaseResponse） */
export interface KnowledgeBase {
  id: string
  name: string
  description: string | null
  status: string
  documentCount: number
  createdAt: string
  updatedAt: string
}

/** 文档入库状态机，与后端 DocumentStatus 枚举一致 */
export type DocumentStatus = 'UPLOADED' | 'PARSING' | 'EMBEDDING' | 'COMPLETED' | 'FAILED'

/** 文档（对应 KnowledgeDocumentResponse） */
export interface KnowledgeDocument {
  id: string
  knowledgeBaseId: string
  fileName: string
  originalFileName: string | null
  contentType: string | null
  fileSize: number
  checksumSha256: string
  status: DocumentStatus
  failureReason: string | null
  chunkCount: number
  createdAt: string
  updatedAt: string
}

/** 文档分块（对应 DocumentChunkResponse） */
export interface DocumentChunk {
  id: string
  documentId: string
  knowledgeBaseId: string
  chunkIndex: number
  content: string
  tokenCount: number
  vectorDocumentId: string
  createdAt: string
  updatedAt: string
}

/** 引用来源（对应 RagReferenceResponse），score 为 RRF 融合分数 */
export interface RagReference {
  chunkId: string
  documentId: string
  knowledgeBaseId: string
  documentName: string | null
  chunkIndex: number | null
  sourceType: string | null
  score: number
  content: string
}

/** 多轮对话历史消息（对应 RagChatMessage） */
export interface RagChatMessage {
  role: 'USER' | 'ASSISTANT'
  content: string
}

/** 问答/检索请求（对应 RagChatRequest / RagSearchRequest） */
export interface RagChatRequest {
  knowledgeBaseId: string
  question: string
  history?: RagChatMessage[]
  topK?: number
  similarityThreshold?: number
}

/** 检索响应（对应 RagSearchResponse） */
export interface RagSearchResponse {
  knowledgeBaseId: string
  question: string
  topK: number
  similarityThreshold: number
  references: RagReference[]
}

/** 问答响应（对应 RagChatResponse） */
export interface RagChatResponse {
  knowledgeBaseId: string
  question: string
  rewrittenQuestion: string | null
  answer: string
  references: RagReference[]
}
