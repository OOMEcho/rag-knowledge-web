<script setup lang="ts">
// 问答页：SSE 流式对话（多轮 + 引用来源）和"仅检索"调试两个 Tab。
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CopyDocument, Delete, Promotion, VideoPause } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import { listKnowledgeBases } from '../api/knowledgeBase'
import { ragChatStream, ragSearch } from '../api/rag'
import ReferenceList from '../components/ReferenceList.vue'
import type { KnowledgeBase, RagChatMessage, RagReference } from '../types/api'

// 与后端 history 校验上限（@Size(max=20)）保持一致。
const MAX_HISTORY = 20

const markdown = new MarkdownIt({ breaks: true, linkify: true })

/** 界面消息模型：assistant 消息在流式期间增量填充 */
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  rewrittenQuestion?: string
  references?: RagReference[]
  error?: boolean
  streaming?: boolean
}

const route = useRoute()

const knowledgeBases = ref<KnowledgeBase[]>([])
const selectedKbId = ref<string | null>(null)
const messages = ref<ChatMessage[]>([])
const question = ref('')
const streaming = ref(false)
const messageListRef = ref<HTMLElement | null>(null)

// 检索参数默认留空使用服务端默认值（topK=5、阈值 0.65）。
const params = reactive({ topK: 5, similarityThreshold: 0.65 })

// 仅检索 Tab 状态。
const activeTab = ref('chat')
const searchQuestion = ref('')
const searchLoading = ref(false)
const searchReferences = ref<RagReference[] | null>(null)

// 流式请求的取消控制器，"停止"按钮触发 abort。
let abortController: AbortController | null = null

const selectedKb = computed(() => knowledgeBases.value.find((kb) => kb.id === selectedKbId.value))

const renderMarkdown = (content: string) => DOMPurify.sanitize(markdown.render(content))

const scrollToBottom = () => {
  nextTick(() => {
    messageListRef.value?.scrollTo({ top: messageListRef.value.scrollHeight })
  })
}

/**
 * 把已完成的对话消息转成后端 history 结构（不含当前提问），超限时保留最近的记录。
 */
const buildHistory = (): RagChatMessage[] => {
  return messages.value
    .filter((message) => !message.error && message.content)
    .map<RagChatMessage>((message) => ({
      role: message.role === 'user' ? 'USER' : 'ASSISTANT',
      content: message.content,
    }))
    .slice(-MAX_HISTORY)
}

const send = async () => {
  const text = question.value.trim()

  if (!text) {
    return
  }

  if (selectedKbId.value === null) {
    ElMessage.warning('请先选择知识库')
    return
  }
  // history 必须在压入本轮提问前构造，否则当前问题会重复出现在历史里。
  const history = buildHistory()

  question.value = ''
  messages.value.push({ role: 'user', content: text })
  const assistantMessage = reactive<ChatMessage>({ role: 'assistant', content: '', streaming: true })
  messages.value.push(assistantMessage)
  streaming.value = true
  scrollToBottom()

  abortController = new AbortController()
  try {
    await ragChatStream(
      {
        knowledgeBaseId: selectedKbId.value,
        question: text,
        history: history.length > 0 ? history : undefined,
        topK: params.topK,
        similarityThreshold: params.similarityThreshold,
      },
      (event, data) => {
        // 按后端事件协议增量填充当前回答。
        if (event === 'rewrittenQuestion') {
          assistantMessage.rewrittenQuestion = data
        } else if (event === 'references') {
          assistantMessage.references = JSON.parse(data) as RagReference[]
        } else if (event === 'delta') {
          assistantMessage.content += data
        } else if (event === 'error') {
          assistantMessage.error = true
          assistantMessage.content = data
        }
        scrollToBottom()
      },
      abortController.signal,
    )
  } catch (error) {
    // 用户主动停止不算错误，保留已生成的部分内容。
    if ((error as Error).name !== 'AbortError') {
      assistantMessage.error = true
      assistantMessage.content = (error as Error).message
    }
  } finally {
    assistantMessage.streaming = false
    streaming.value = false
    abortController = null
    scrollToBottom()
  }
}

const stop = () => {
  abortController?.abort()
}

const clearConversation = () => {
  messages.value = []
}

const copyContent = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败，请手动选择文本复制')
  }
}

const runSearch = async () => {
  const text = searchQuestion.value.trim()

  if (!text) {
    return
  }

  if (selectedKbId.value === null) {
    ElMessage.warning('请先选择知识库')
    return
  }
  searchLoading.value = true
  searchReferences.value = null
  try {
    const response = await ragSearch({
      knowledgeBaseId: selectedKbId.value,
      question: text,
      topK: params.topK,
      similarityThreshold: params.similarityThreshold,
    })
    searchReferences.value = response.references
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    searchLoading.value = false
  }
}

// 切换知识库后上下文不再成立，清空当前对话。
watch(selectedKbId, () => {
  messages.value = []
  searchReferences.value = null
})

onMounted(async () => {
  try {
    // 问答页需要完整知识库列表供选择，单页 100 个对本地系统绰绰有余。
    const page = await listKnowledgeBases({ pageNum: 1, pageSize: 100 })
    knowledgeBases.value = page.records

    // 支持从知识库/文档页带 kbId 跳转直接选中。
    const kbIdFromQuery = route.query.kbId ? String(route.query.kbId) : ''

    if (kbIdFromQuery && page.records.some((kb) => kb.id === kbIdFromQuery)) {
      selectedKbId.value = kbIdFromQuery
    } else if (page.records.length > 0) {
      selectedKbId.value = page.records[0].id
    }
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
})
</script>

<template>
  <div class="chat-page">
    <div class="chat-sidebar">
      <div class="sidebar-label">知识库</div>
      <el-select v-model="selectedKbId" placeholder="选择知识库" filterable>
        <el-option v-for="kb in knowledgeBases" :key="kb.id" :label="kb.name" :value="kb.id" />
      </el-select>
      <div v-if="selectedKb" class="sidebar-kb-info">{{ selectedKb.documentCount }} 个文档</div>

      <el-divider />

      <div class="sidebar-label">检索参数</div>
      <el-form label-position="top" size="small">
        <el-form-item label="topK">
          <el-input-number v-model="params.topK" :min="1" :max="20" class="param-input" />
        </el-form-item>
        <el-form-item label="相似度阈值">
          <el-input-number
            v-model="params.similarityThreshold"
            :min="0"
            :max="1"
            :step="0.05"
            :precision="2"
            class="param-input"
          />
        </el-form-item>
      </el-form>

      <el-divider />

      <el-button :icon="Delete" :disabled="messages.length === 0 || streaming" @click="clearConversation">
        新对话
      </el-button>
    </div>

    <div class="chat-main">
      <el-tabs v-model="activeTab" class="chat-tabs">
        <el-tab-pane label="对话" name="chat">
          <div ref="messageListRef" class="message-list">
            <el-empty
              v-if="messages.length === 0"
              description="选择知识库后输入问题开始对话，支持基于上下文的追问"
            />
            <div
              v-for="(message, index) in messages"
              :key="index"
              class="message-row"
              :class="message.role === 'user' ? 'message-row-user' : 'message-row-assistant'"
            >
              <div class="message-bubble" :class="message.role === 'user' ? 'bubble-user' : 'bubble-assistant'">
                <div v-if="message.rewrittenQuestion" class="rewritten-tip">
                  已根据上下文理解为：{{ message.rewrittenQuestion }}
                </div>
                <template v-if="message.role === 'assistant'">
                  <el-alert v-if="message.error" :title="message.content" type="error" :closable="false" />
                  <template v-else>
                    <!-- 渲染前经 DOMPurify 清洗，模型输出中的脚本类内容不会执行 -->
                    <div class="markdown-body" v-html="renderMarkdown(message.content)" />
                    <span v-if="message.streaming" class="typing-cursor" />
                    <ReferenceList v-if="message.references" :references="message.references" />
                    <div v-if="!message.streaming && !message.error && message.content" class="message-actions">
                      <el-button :icon="CopyDocument" size="small" text @click="copyContent(message.content)">
                        复制
                      </el-button>
                    </div>
                  </template>
                </template>
                <template v-else>{{ message.content }}</template>
              </div>
            </div>
          </div>

          <div class="input-area">
            <el-input
              v-model="question"
              type="textarea"
              :rows="2"
              resize="none"
              :placeholder="streaming ? '正在回答中…' : '输入问题，Enter 发送，Shift+Enter 换行'"
              :disabled="streaming"
              @keydown.enter.exact.prevent="send"
            />
            <el-button v-if="streaming" type="danger" :icon="VideoPause" @click="stop">停止</el-button>
            <el-button v-else type="primary" :icon="Promotion" :disabled="!question.trim()" @click="send">
              发送
            </el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="仅检索" name="search">
          <div class="search-panel">
            <div class="search-input-row">
              <el-input
                v-model="searchQuestion"
                placeholder="输入检索问题，直接查看混合检索（向量 + 关键词 RRF 融合）命中结果"
                clearable
                @keyup.enter="runSearch"
              />
              <el-button type="primary" :loading="searchLoading" @click="runSearch">检索</el-button>
            </div>
            <div v-loading="searchLoading" class="search-result">
              <ReferenceList v-if="searchReferences && searchReferences.length > 0" :references="searchReferences" />
              <el-empty
                v-else-if="searchReferences !== null && !searchLoading"
                description="没有命中任何分块，可尝试降低相似度阈值"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  gap: 16px;
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.chat-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-sizing: border-box;
  align-self: flex-start;
}

.sidebar-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.sidebar-kb-info {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 6px;
}

.param-input {
  width: 100%;
}

.chat-main {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 8px;
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
}

.chat-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
}

.chat-tabs :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px;
  min-height: 0;
}

.message-row {
  display: flex;
  margin-bottom: 14px;
}

.message-row-user {
  justify-content: flex-end;
}

.message-row-assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 85%;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.bubble-user {
  background: #409eff;
  color: #fff;
  white-space: pre-wrap;
}

.bubble-assistant {
  background: #f4f4f5;
  color: #303133;
}

.rewritten-tip {
  font-size: 12px;
  color: #909399;
  border-left: 3px solid #dcdfe6;
  padding-left: 8px;
  margin-bottom: 6px;
}

.typing-cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: #909399;
  vertical-align: -2px;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.message-actions {
  margin-top: 4px;
}

.input-area {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.search-panel {
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.search-result {
  flex: 1;
  overflow-y: auto;
  min-height: 120px;
}
</style>
