<script setup lang="ts">
// 应用外层布局：顶部导航（知识库/问答）+ 设置入口，内容区由路由填充。
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Setting } from '@element-plus/icons-vue'
import SettingsDialog from './components/SettingsDialog.vue'

const route = useRoute()
const settingsVisible = ref(false)

// 文档页属于知识库的下级页面，导航高亮仍然落在"知识库"上。
const activeMenu = computed(() => (route.path.startsWith('/chat') ? '/chat' : '/kbs'))
</script>

<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <div class="app-title">RAG 知识库</div>
      <el-menu mode="horizontal" router :default-active="activeMenu" :ellipsis="false" class="app-menu">
        <el-menu-item index="/kbs">知识库</el-menu-item>
        <el-menu-item index="/chat">问答</el-menu-item>
      </el-menu>
      <el-button :icon="Setting" circle text title="设置" @click="settingsVisible = true" />
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>

  <SettingsDialog v-model="settingsVisible" />
</template>

<style scoped>
.app-container {
  height: 100%;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
}

.app-menu {
  flex: 1;
  border-bottom: none;
}

.app-main {
  height: calc(100% - 60px);
  overflow: auto;
}
</style>
