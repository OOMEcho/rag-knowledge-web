import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import type { ApiResponse } from '../types/api'
import { useSettingsStore } from '../stores/settings'

// 不在实例上固定 baseURL：设置面板修改后端地址后无需刷新页面即可生效。
const instance = axios.create({ timeout: 300000 })

instance.interceptors.request.use((config) => {
  const settings = useSettingsStore()
  config.baseURL = settings.apiBase || ''

  // 后端开启认证时所有业务请求都需要携带 API Key 请求头。
  if (settings.apiKey) {
    config.headers.set('X-API-Key', settings.apiKey)
  }
  return config
})

/**
 * 统一请求入口：解包 ApiResponse，失败时抛出携带后端 message 的 Error。
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await instance.request<ApiResponse<T>>(config)
    const body = response.data

    // HTTP 200 但业务失败的场景（理论上后端错误都带非 2xx 状态码，此处兜底）。
    if (!body.success) {
      throw new Error(body.message || '请求失败')
    }
    return body.data
  } catch (error) {
    throw normalizeError(error)
  }
}

/**
 * 把 axios 异常统一转成携带可展示消息的 Error。
 */
function normalizeError(error: unknown): Error {
  if (error instanceof AxiosError) {
    // 后端错误响应统一为 ApiResponse 格式，优先展示其中的业务消息。
    const body = error.response?.data as ApiResponse<unknown> | undefined

    if (body?.message) {
      return new Error(body.message)
    }

    if (error.response) {
      return new Error(`请求失败（HTTP ${error.response.status}）`)
    }
    return new Error('无法连接后端服务，请检查服务是否启动或设置中的后端地址')
  }
  return error instanceof Error ? error : new Error(String(error))
}
