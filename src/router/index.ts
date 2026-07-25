import { createRouter, createWebHashHistory } from 'vue-router'
import DefaultPage from '../views/DefaultPage.vue'
import NewTabPage from '../views/NewTabPage.vue'
import HistoryPage from '../views/HistoryPage.vue'
import AiPage from '../views/AiPage.vue'
import DownloadsPage from '../views/DownloadsPage.vue'
import LogsPage from '../views/LogsPage.vue'
import SettingsPage from '../views/SettingsPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/default'
    },
    {
      path: '/default',
      name: 'default',
      component: DefaultPage,
      meta: { title: '首页' }
    },
    {
      path: '/newtab',
      name: 'newtab',
      component: NewTabPage,
      meta: { title: '新标签页' }
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryPage,
      meta: { title: '历史记录' }
    },
    {
      path: '/ai',
      name: 'ai',
      component: AiPage,
      meta: { title: 'AI 助手' }
    },
    {
      path: '/downloads',
      name: 'downloads',
      component: DownloadsPage,
      meta: { title: '下载管理' }
    },
    {
      path: '/logs',
      name: 'logs',
      component: LogsPage,
      meta: { title: '日志查看' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage,
      meta: { title: '设置' }
    }
  ]
})

router.afterEach((to) => {
  const title = to.meta.title as string
  if (title) {
    document.title = title
  }
})

export default router
