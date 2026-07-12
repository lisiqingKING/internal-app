import { createRouter, createWebHashHistory } from 'vue-router'
import DefaultPage from '../views/DefaultPage.vue'
import HistoryPage from '../views/HistoryPage.vue'
import AiPage from '../views/AiPage.vue'
import DownloadsPage from '../views/DownloadsPage.vue'
import LogsPage from '../views/LogsPage.vue'

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
      component: DefaultPage
    },
    {
      path: '/history',
      name: 'history',
      component: HistoryPage
    },
    {
      path: '/ai',
      name: 'ai',
      component: AiPage
    },
    {
      path: '/downloads',
      name: 'downloads',
      component: DownloadsPage
    },
    {
      path: '/logs',
      name: 'logs',
      component: LogsPage
    }
  ]
})

export default router