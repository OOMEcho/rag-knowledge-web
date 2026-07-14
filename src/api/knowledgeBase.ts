import { request } from './http'
import type { KnowledgeBase, PageResponse } from '../types/api'

/** 分页查询知识库 */
export function listKnowledgeBases(params: { keyword?: string; pageNum?: number; pageSize?: number }) {
  return request<PageResponse<KnowledgeBase>>({ method: 'GET', url: '/api/v1/knowledge-bases', params })
}

/** 查询知识库详情 */
export function getKnowledgeBase(id: string) {
  return request<KnowledgeBase>({ method: 'GET', url: `/api/v1/knowledge-bases/${id}` })
}

/** 创建知识库 */
export function createKnowledgeBase(data: { name: string; description?: string }) {
  return request<KnowledgeBase>({ method: 'POST', url: '/api/v1/knowledge-bases', data })
}

/** 更新知识库 */
export function updateKnowledgeBase(id: string, data: { name: string; description?: string }) {
  return request<KnowledgeBase>({ method: 'PUT', url: `/api/v1/knowledge-bases/${id}`, data })
}

/** 删除空知识库（含文档时后端返回 409） */
export function deleteKnowledgeBase(id: string) {
  return request<void>({ method: 'DELETE', url: `/api/v1/knowledge-bases/${id}` })
}
