import { useSettingsStore } from '../stores/settings'

/** SSE 事件回调：event 为事件名（rewrittenQuestion/references/delta/done/error），data 为原始文本 */
export type SseEventHandler = (event: string, data: string) => void

/**
 * 以 POST 发起 SSE 流式请求并逐事件回调。
 *
 * 原生 EventSource 只支持 GET，问答接口是 POST + JSON 体，
 * 因此用 fetch + ReadableStream 手动解析 text/event-stream 协议。
 */
export async function postSse(
  path: string,
  body: unknown,
  onEvent: SseEventHandler,
  signal?: AbortSignal,
): Promise<void> {
  const settings = useSettingsStore()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (settings.apiKey) {
    headers['X-API-Key'] = settings.apiKey
  }

  const response = await fetch(`${settings.apiBase || ''}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  })

  // 参数校验失败、认证失败等在流建立前发生，返回普通 JSON 错误而不是 SSE。
  if (!response.ok || !response.body) {
    let message = `请求失败（HTTP ${response.status}）`
    try {
      const errorBody = await response.json()
      if (errorBody?.message) {
        message = errorBody.message
      }
    } catch {
      // 响应体不是 JSON 时保留默认消息。
    }
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let eventName = 'message'
  let dataLines: string[] = []

  // 一个事件以空行结束；多行 data 按 SSE 规范用换行拼接。
  const dispatch = () => {
    if (dataLines.length > 0) {
      onEvent(eventName, dataLines.join('\n'))
    }
    eventName = 'message'
    dataLines = []
  }

  for (;;) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })

    let newlineIndex = buffer.indexOf('\n')
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, '')
      buffer = buffer.slice(newlineIndex + 1)
      newlineIndex = buffer.indexOf('\n')

      if (line === '') {
        dispatch()
        continue
      }

      // 冒号开头是注释行（如心跳），按规范忽略。
      if (line.startsWith(':')) {
        continue
      }

      if (line.startsWith('event:')) {
        eventName = line.slice(6).replace(/^ /, '')
      } else if (line.startsWith('data:')) {
        // 规范要求去掉冒号后的单个空格，其余空白属于数据本身。
        dataLines.push(line.slice(5).replace(/^ /, ''))
      }
    }
  }
  dispatch()
}
