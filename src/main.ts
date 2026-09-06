import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/element-plus-theme.css'
import App from './App.vue'
import router from './router'
import './assets/main.css'
import './styles/components.css'
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css'
import ContextMenu from '@imengyu/vue3-context-menu'

const app = createApp(App)
app.use(router)
app.use(ContextMenu)
app.use(ElementPlus)
app.mount('#app')