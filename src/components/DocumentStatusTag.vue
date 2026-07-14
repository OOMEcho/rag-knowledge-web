<script setup lang="ts">
// 文档入库状态徽章：状态机各阶段映射为不同颜色，处理中状态显示加载图标。
import { computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import type { DocumentStatus } from '../types/api'

const props = defineProps<{ status: DocumentStatus }>()

interface StatusMeta {
  label: string
  type: 'primary' | 'success' | 'info' | 'warning' | 'danger'
  processing: boolean
}

const STATUS_META: Record<DocumentStatus, StatusMeta> = {
  UPLOADED: { label: '已上传', type: 'info', processing: false },
  PARSING: { label: '解析中', type: 'primary', processing: true },
  EMBEDDING: { label: '向量化中', type: 'warning', processing: true },
  COMPLETED: { label: '已完成', type: 'success', processing: false },
  FAILED: { label: '失败', type: 'danger', processing: false },
}

const meta = computed(
  () => STATUS_META[props.status] ?? { label: props.status, type: 'info' as const, processing: false },
)
</script>

<template>
  <el-tag :type="meta.type" size="small" :effect="meta.processing ? 'plain' : 'light'">
    <el-icon v-if="meta.processing" class="is-loading status-icon"><Loading /></el-icon>
    {{ meta.label }}
  </el-tag>
</template>

<style scoped>
.status-icon {
  vertical-align: -2px;
  margin-right: 2px;
}
</style>
