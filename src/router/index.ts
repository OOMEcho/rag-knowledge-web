import { createRouter, createWebHashHistory } from 'vue-router'

// hash 路由无需服务器端 fallback 配置，任意静态托管方式都能直接部署。
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/kbs' },
    {
      path: '/kbs',
      name: 'knowledge-bases',
      component: () => import('../views/KnowledgeBaseView.vue'),
    },
    {
      path: '/kbs/:id/documents',
      name: 'documents',
      component: () => import('../views/DocumentView.vue'),
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatView.vue'),
    },
  ],
})

export default router
