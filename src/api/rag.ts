import { request } from './http'
import { postSse, type SseEventHandler } from './sse'
import type { RagChatRequest, RagChatResponse, RagSearchResponse } from '../types/api'

/** 混合检索：返回按 RRF 融合分数排序的引用列表 */
export function ragSearch(data: {
  knowledgeBaseId: string
  question: string
  topK?: number
  similarityThreshold?: number
}) {
  return request<RagSearchResponse>({ method: 'POST', url: '/api/v1/rag/search', data })
}

/** 同步问答（非流式，界面默认使用流式接口） */
export function ragChat(data: RagChatRequest) {
  return request<RagChatResponse>({ method: 'POST', url: '/api/v1/rag/chat', data })
}

/**
 * 流式问答：事件顺序 rewrittenQuestion?（仅多轮改写时）→ references → delta* → done，
 * 任何失败都会转为 error 事件在流内下发。
 */
export function ragChatStream(data: RagChatRequest, onEvent: SseEventHandler, signal?: AbortSignal) {
  return postSse('/api/v1/rag/chat/stream', data, onEvent, signal)
}
