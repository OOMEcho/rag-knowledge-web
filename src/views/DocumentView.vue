<script setup lang="ts">
// 文档管理页：上传（自动触发入库）、状态轮询、失败重试、分块查看、删除。
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type UploadRequestOptions } from 'element-plus'
import { ArrowLeft, ChatDotRound, UploadFilled } from '@element-plus/icons-vue'
import { getKnowledgeBase } from '../api/knowledgeBase'
import {
  deleteDocument,
  ingestDocument,
  listDocumentChunks,
  listDocuments,
  retryIngestion,
  uploadDocument,
} from '../api/document'
import DocumentStatusTag from '../components/DocumentStatusTag.vue'
import type { DocumentChunk, KnowledgeBase, KnowledgeDocument } from '../types/api'

// 与后端 rag.ingestion.allowed-file-extensions 默认白名单保持一致，前端提前校验减少无效请求。
const ALLOWED_EXTENSIONS = ['txt', 'md', 'markdown', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'html', 'htm']
const MAX_FILE_SIZE = 50 * 1024 * 1024
// 存在处理中文档时的状态刷新间隔。
const POLL_INTERVAL_MS = 2000

const route = useRoute()
const router = useRouter()
const knowledgeBaseId = String(route.params.id)

const knowledgeBase = ref<KnowledgeBase | null>(null)
const loading = ref(false)
const records = ref<KnowledgeDocument[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

// 轮询用定时器句柄；组件卸载时必须清除，避免离开页面后仍在请求。
let pollTimer: number | null = null

// 分块抽屉状态。
const chunkDrawerVisible = ref(false)
const chunkDocument = ref<KnowledgeDocument | null>(null)
const chunks = ref<DocumentChunk[]>([])
const chunkTotal = ref(0)
const chunkPageNum = ref(1)
const chunkLoading = ref(false)

const acceptAttr = computed(() => ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(','))

const load = async (silent = false) => {
  if (!silent) {
    loading.value = true
  }
  try {
    const page = await listDocuments({ knowledgeBaseId, pageNum: pageNum.value, pageSize: pageSize.value })
    records.value = page.records
    total.value = page.total
    schedulePollIfProcessing()
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

/**
 * 存在处理中文档时安排下一次静默刷新，全部到终态后自动停止。
 */
const schedulePollIfProcessing = () => {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer)
    pollTimer = null
  }
  const hasProcessing = records.value.some((doc) => doc.status === 'PARSING' || doc.status === 'EMBEDDING')

  if (hasProcessing) {
    pollTimer = window.setTimeout(() => load(true), POLL_INTERVAL_MS)
  }
}

/**
 * 自定义上传：走统一 axios 通道以复用 API Key 和错误处理，成功后立即触发入库。
 */
const handleUpload = async (options: UploadRequestOptions) => {
  const file = options.file as File
  try {
    const document = await uploadDocument(knowledgeBaseId, file)
    // 上传成功即入库是最常见的使用路径；入库失败不影响上传结果，可在列表中手动重试。
    try {
      await ingestDocument(document.id)
      ElMessage.success(`「${file.name}」已上传并开始入库`)
    } catch (error) {
      ElMessage.warning(`「${file.name}」上传成功但入库启动失败：${(error as Error).message}`)
    }
    await load()
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

const beforeUpload = (file: File) => {
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    ElMessage.error(`不支持的文件类型，允许：${ALLOWED_EXTENSIONS.join('、')}`)
    return false
  }

  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error('文件大小超过 50MB 限制')
    return false
  }
  return true
}

const triggerIngest = async (row: KnowledgeDocument) => {
  try {
    await ingestDocument(row.id)
    ElMessage.success('已开始入库')
    await load()
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

const retry = async (row: KnowledgeDocument) => {
  try {
    await retryIngestion(row.id)
    ElMessage.success('已重新开始入库')
    await load()
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

const remove = async (row: KnowledgeDocument) => {
  try {
    await ElMessageBox.confirm(
      `确定删除文档「${row.fileName}」吗？关联的分块和向量会一并清理。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }

  try {
    await deleteDocument(row.id)
    ElMessage.success('文档已删除')
    await load()
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

const openChunks = async (row: KnowledgeDocument) => {
  chunkDocument.value = row
  chunkPageNum.value = 1
  chunkDrawerVisible.value = true
  await loadChunks()
}

const loadChunks = async () => {
  if (!chunkDocument.value) {
    return
  }
  chunkLoading.value = true
  try {
    const page = await listDocumentChunks(chunkDocument.value.id, { pageNum: chunkPageNum.value, pageSize: 5 })
    chunks.value = page.records
    chunkTotal.value = page.total
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    chunkLoading.value = false
  }
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

onMounted(async () => {
  try {
    knowledgeBase.value = await getKnowledgeBase(knowledgeBaseId)
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
  await load()
})

onBeforeUnmount(() => {
  if (pollTimer !== null) {
    window.clearTimeout(pollTimer)
  }
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <el-button :icon="ArrowLeft" text @click="router.push({ name: 'knowledge-bases' })">返回</el-button>
      <div class="page-title">{{ knowledgeBase?.name ?? '文档管理' }}</div>
      <el-button
        type="primary"
        plain
        :icon="ChatDotRound"
        @click="router.push({ name: 'chat', query: { kbId: knowledgeBaseId } })"
      >
        去提问
      </el-button>
    </div>

    <el-upload
      drag
      multiple
      :accept="acceptAttr"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :http-request="handleUpload"
      class="upload-area"
    >
      <el-icon size="36" color="#909399"><UploadFilled /></el-icon>
      <div class="upload-text">拖拽文件到这里，或点击选择文件上传（上传后自动入库，单文件不超过 50MB）</div>
    </el-upload>

    <el-table v-loading="loading" :data="records" stripe>
      <el-table-column prop="fileName" label="文件名" min-width="220" show-overflow-tooltip />
      <el-table-column label="大小" width="90">
        <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110" align="center">
        <template #default="{ row }">
          <DocumentStatusTag :status="row.status" />
        </template>
      </el-table-column>
      <el-table-column prop="chunkCount" label="分块数" width="80" align="center" />
      <el-table-column label="失败原因" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.failureReason || '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="250" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'UPLOADED'" size="small" type="primary" plain @click="triggerIngest(row)">
            入库
          </el-button>
          <el-button v-if="row.status === 'FAILED'" size="small" type="warning" plain @click="retry(row)">
            重试
          </el-button>
          <el-button v-if="row.status === 'COMPLETED'" size="small" @click="openChunks(row)">查看分块</el-button>
          <!-- 后端禁止删除入库中的文档，前端提前禁用，避免确认后才被拒绝。 -->
          <el-button
            size="small"
            type="danger"
            plain
            :disabled="row.status === 'PARSING' || row.status === 'EMBEDDING'"
            :title="row.status === 'PARSING' || row.status === 'EMBEDDING' ? '入库处理中，请等待完成后删除' : '删除文档'"
            @click="remove(row)"
          >删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="还没有文档，拖拽文件到上方区域上传" />
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="pageNum"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      class="pagination"
      @current-change="() => load()"
    />

    <el-drawer v-model="chunkDrawerVisible" :title="`分块预览 - ${chunkDocument?.fileName ?? ''}`" size="45%">
      <div v-loading="chunkLoading">
        <el-card v-for="chunk in chunks" :key="chunk.id" shadow="never" class="chunk-card">
          <template #header>
            <span class="chunk-header">分块 #{{ chunk.chunkIndex }} · {{ chunk.tokenCount }} tokens</span>
          </template>
          <div class="chunk-content">{{ chunk.content }}</div>
        </el-card>
        <el-empty v-if="!chunkLoading && chunks.length === 0" description="没有分块数据" />
      </div>
      <el-pagination
        v-model:current-page="chunkPageNum"
        :total="chunkTotal"
        :page-size="5"
        layout="total, prev, pager, next"
        class="pagination"
        @current-change="loadChunks"
      />
    </el-drawer>
  </div>
</template>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.page-title {
  flex: 1;
  font-size: 17px;
  font-weight: 600;
}

.upload-area {
  margin-bottom: 16px;
}

.upload-text {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}

.chunk-card {
  margin-bottom: 12px;
}

.chunk-header {
  font-size: 13px;
  color: #606266;
}

.chunk-content {
  font-size: 13px;
  line-height: 1.7;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
