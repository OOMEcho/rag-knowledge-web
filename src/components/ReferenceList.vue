<script setup lang="ts">
// 引用来源列表：折叠面板展示每条引用的文档名、分块序号和 RRF 融合分数，展开可读原文。
import type { RagReference } from '../types/api'

defineProps<{ references: RagReference[] }>()
</script>

<template>
  <div v-if="references.length > 0" class="reference-list">
    <div class="reference-title">引用来源（{{ references.length }} 条）</div>
    <el-collapse>
      <el-collapse-item v-for="(reference, index) in references" :key="reference.chunkId" :name="index">
        <template #title>
          <span class="reference-header">
            <el-tag size="small" type="info" class="reference-index">[{{ index + 1 }}]</el-tag>
            <span class="reference-doc">{{ reference.documentName || '未知文档' }}</span>
            <span v-if="reference.chunkIndex !== null" class="reference-chunk">分块 #{{ reference.chunkIndex }}</span>
            <span class="reference-score">score {{ reference.score.toFixed(4) }}</span>
          </span>
        </template>
        <div class="reference-content">{{ reference.content }}</div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.reference-list {
  margin-top: 8px;
}

.reference-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.reference-header {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.reference-index {
  flex-shrink: 0;
}

.reference-doc {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-chunk,
.reference-score {
  font-size: 12px;
  color: #909399;
  flex-shrink: 0;
}

.reference-content {
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
