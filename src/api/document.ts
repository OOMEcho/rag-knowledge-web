import { request } from './http'
import type { DocumentChunk, KnowledgeDocument, PageResponse } from '../types/api'

/** 分页查询文档 */
export function listDocuments(params: {
  knowledgeBaseId?: string
  status?: string
  pageNum?: number
  pageSize?: number
}) {
  return request<PageResponse<KnowledgeDocument>>({ method: 'GET', url: '/api/v1/documents', params })
}

/** 查询文档详情（异步入库时轮询此接口获取终态） */
export function getDocument(id: string) {
  return request<KnowledgeDocument>({ method: 'GET', url: `/api/v1/documents/${id}` })
}

/** 上传文档 */
export function uploadDocument(knowledgeBaseId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<KnowledgeDocument>({
    method: 'POST',
    url: '/api/v1/documents/upload',
    params: { knowledgeBaseId },
    data: formData,
  })
}

/** 触发异步入库，立即返回 PARSING 状态 */
export function ingestDocument(id: string) {
  return request<KnowledgeDocument>({ method: 'POST', url: `/api/v1/documents/${id}/ingest` })
}

/** 重试失败文档入库（仅 FAILED 状态允许） */
export function retryIngestion(id: string) {
  return request<KnowledgeDocument>({ method: 'POST', url: `/api/v1/documents/${id}/retry-ingestion` })
}

/** 分页查询文档分块 */
export function listDocumentChunks(id: string, params: { pageNum?: number; pageSize?: number }) {
  return request<PageResponse<DocumentChunk>>({ method: 'GET', url: `/api/v1/documents/${id}/chunks`, params })
}

/** 删除文档（入库处理中时后端返回 409） */
export function deleteDocument(id: string) {
  return request<void>({ method: 'DELETE', url: `/api/v1/documents/${id}` })
}
