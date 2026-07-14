<script setup lang="ts">
// 知识库管理页：列表 + 新建/编辑对话框 + 删除确认，入口跳转文档管理和问答。
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import {
  createKnowledgeBase,
  deleteKnowledgeBase,
  listKnowledgeBases,
  updateKnowledgeBase,
} from '../api/knowledgeBase'
import type { KnowledgeBase } from '../types/api'

const router = useRouter()

const loading = ref(false)
const records = ref<KnowledgeBase[]>([])
const total = ref(0)
const keyword = ref('')
const pageNum = ref(1)
const pageSize = ref(10)

// 对话框同时承担新建和编辑：editingId 为 null 表示新建。
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({ name: '', description: '' })
const saving = ref(false)

const load = async () => {
  loading.value = true
  try {
    const page = await listKnowledgeBases({
      keyword: keyword.value || undefined,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    records.value = page.records
    total.value = page.total
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    loading.value = false
  }
}

const search = () => {
  pageNum.value = 1
  load()
}

const openCreate = () => {
  editingId.value = null
  form.name = ''
  form.description = ''
  dialogVisible.value = true
}

const openEdit = (row: KnowledgeBase) => {
  editingId.value = row.id
  form.name = row.name
  form.description = row.description ?? ''
  dialogVisible.value = true
}

const save = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请输入知识库名称')
    return
  }
  saving.value = true
  try {
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined }

    if (editingId.value === null) {
      await createKnowledgeBase(payload)
      ElMessage.success('知识库已创建')
    } else {
      await updateKnowledgeBase(editingId.value, payload)
      ElMessage.success('知识库已更新')
    }
    dialogVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error((error as Error).message)
  } finally {
    saving.value = false
  }
}

const remove = async (row: KnowledgeBase) => {
  // 后端对非空知识库返回 409，前端提前给出确认减少误操作。
  try {
    await ElMessageBox.confirm(`确定删除知识库「${row.name}」吗？只有空知识库可以删除。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  try {
    await deleteKnowledgeBase(row.id)
    ElMessage.success('知识库已删除')
    await load()
  } catch (error) {
    ElMessage.error((error as Error).message)
  }
}

const goDocuments = (row: KnowledgeBase) => {
  router.push({ name: 'documents', params: { id: row.id } })
}

const goChat = (row: KnowledgeBase) => {
  router.push({ name: 'chat', query: { kbId: row.id } })
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="按名称搜索"
        clearable
        class="toolbar-search"
        :prefix-icon="Search"
        @keyup.enter="search"
        @clear="search"
      />
      <el-button type="primary" :icon="Plus" @click="openCreate">新建知识库</el-button>
    </div>

    <el-table v-loading="loading" :data="records" stripe>
      <el-table-column prop="name" label="名称" min-width="180">
        <template #default="{ row }">
          <el-link type="primary" @click="goDocuments(row)">{{ row.name }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ row.description || '—' }}</template>
      </el-table-column>
      <el-table-column prop="documentCount" label="文档数" width="90" align="center" />
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">{{ row.createdAt?.replace('T', ' ').slice(0, 19) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="goDocuments(row)">文档管理</el-button>
          <el-button size="small" type="primary" plain @click="goChat(row)">去提问</el-button>
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" plain @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <el-empty description="还没有知识库，点击右上角新建" />
      </template>
    </el-table>

    <el-pagination
      v-model:current-page="pageNum"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      class="pagination"
      @current-change="load"
    />

    <el-dialog v-model="dialogVisible" :title="editingId === null ? '新建知识库' : '编辑知识库'" width="480px">
      <el-form label-width="70px" @submit.prevent>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="128" show-word-limit placeholder="知识库名称（不区分大小写唯一）" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="用途说明（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-search {
  width: 280px;
}

.pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
