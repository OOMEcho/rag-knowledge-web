import { defineStore } from 'pinia'

const API_BASE_KEY = 'rag.apiBase'
const API_KEY_KEY = 'rag.apiKey'

// 连接设置持久化到 localStorage：开发模式走 Vite 代理无需配置；
// 前后端分离部署时在设置面板填写后端地址和 API Key。
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // 后端地址，空字符串表示同源（开发代理或同域部署）。
    apiBase: localStorage.getItem(API_BASE_KEY) ?? '',
    // API Key，后端开启认证时必填，通过 X-API-Key 请求头提交。
    apiKey: localStorage.getItem(API_KEY_KEY) ?? '',
  }),
  actions: {
    save(apiBase: string, apiKey: string) {
      // 去掉尾部斜杠，避免拼接出现双斜杠路径。
      this.apiBase = apiBase.trim().replace(/\/+$/, '')
      this.apiKey = apiKey.trim()
      localStorage.setItem(API_BASE_KEY, this.apiBase)
      localStorage.setItem(API_KEY_KEY, this.apiKey)
    },
  },
})
