<script setup lang="ts">
// 连接设置弹窗：后端地址 + API Key，保存到 localStorage 立即生效。
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '../stores/settings'

const visible = defineModel<boolean>({ required: true })

const settings = useSettingsStore()
const apiBase = ref(settings.apiBase)
const apiKey = ref(settings.apiKey)

// 每次打开时回填当前设置，放弃未保存的修改。
watch(visible, (value) => {
  if (value) {
    apiBase.value = settings.apiBase
    apiKey.value = settings.apiKey
  }
})

const save = () => {
  settings.save(apiBase.value, apiKey.value)
  visible.value = false
  ElMessage.success('设置已保存')
}
</script>

<template>
  <el-dialog v-model="visible" title="连接设置" width="480px">
    <el-form label-width="90px" @submit.prevent>
      <el-form-item label="后端地址">
        <el-input v-model="apiBase" placeholder="留空使用同源地址（开发模式经 Vite 代理）" clearable />
        <div class="form-tip">前后端分离部署时填写后端地址，如 http://192.168.1.10:8080</div>
      </el-form-item>
      <el-form-item label="API Key">
        <el-input v-model="apiKey" type="password" show-password placeholder="后端未开启认证时留空" clearable />
        <div class="form-tip">后端开启认证（RAG_SECURITY_ENABLED=true）时必填</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 4px;
}
</style>
