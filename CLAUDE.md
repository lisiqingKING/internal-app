# app (internal-app 子应用)

## 角色
这是一个 **Vue 3 SPA 子应用**, 被父项目 `electron-vite-project` (位于 `C:\Users\lsq\my-projects\electron-vite-project`) 作为内置浏览器页面加载.

**它不是独立应用**, 在父项目的 `lsqapp://` 协议下运行, 通过 `window.bridge` 调用父项目暴露的 IPC 能力.

## 在父项目中的标识

| 项 | 值 |
|---|---|
| 子应用名 (容器内路径) | `internal-app` |
| 容器内协议 | `lsqapp://internal-app/<route>` |
| dev server | http://localhost:5273 |
| 构建产物落地 | 父项目 `apps/internal-app/dist/` |

## 关键目录

- [src/main.ts](src/main.ts) — Vue 入口
- [src/App.vue](src/App.vue) — 根组件, **这里初始化 `window.bridge` 监听**
- [src/router/index.ts](src/router/index.ts) — vue-router 配置 (hash 模式)
- [src/views/](src/views/) — 页面组件
  - `DefaultPage.vue` — 默认页
  - `HistoryPage.vue` — 历史记录
  - `AiPage.vue` — AI 聊天入口
- [vite.config.ts](vite.config.ts) — `base: './'` (相对路径, 必须保留! 否则加载不到资源)

## 路由表

| 路径 | 组件 | 触发方式 |
|---|---|---|
| `/` | 重定向到 `/default` | — |
| `/default` | `DefaultPage.vue` | 父项目默认标签页 |
| `/history` | `HistoryPage.vue` | 父项目 "历史记录" 标签页 |
| `/ai` | `AiPage.vue` | 父项目书签栏 AI 按钮 |

新增路由步骤:
1. 在 `src/views/` 新建组件
2. 在 [src/router/index.ts](src/router/index.ts) 注册
3. 如需从父项目直接跳转, 同步修改父项目 [src/App.vue](C:\Users\lsq\my-projects\electron-vite-project\src\App.vue) 的 bookmarks 列表

## 跨项目契约 (CRITICAL)

### 1. `window.bridge` 调用

在 [src/App.vue](src/App.vue#L8-L13) 已挂载:
```js
const electronApis = window.bridge.getModules(['history', 'ai'])
window.electronApis = electronApis  // 全局可访问
```

**当前可用模块** (来自父项目 [electron/preload-app.ts](C:\Users\lsq\my-projects\electron-vite-project\electron\preload-app.ts)):
- `history` — 历史记录 (get / clear / delete)
- `ai` — AI 会话 (list / create / updateTitle / updateMessages / delete)
- `tabs` — 标签页操作 (如需要)

**调用示例**:
```js
const list = await window.electronApis.history.get()
const sess = await window.electronApis.ai.create('新会话')
```

**新增 IPC 调用** 三处必须同步:
1. 父项目 [electron/modules/](C:\Users\lsq\my-projects\electron-vite-project\electron\modules/) 添加 proxy 方法
2. 父项目 [electron/tab/tabHandlers.ts](C:\Users\lsq\my-projects\electron-vite-project\electron\tab\tabHandlers.ts) 添加 ipcMain.handle
3. 在 [src/App.vue](src/App.vue) `getModules([...])` 中按需添加模块名

### 2. 资源路径必须用相对路径

[vite.config.ts](vite.config.ts) `base: './'` — 这保证了子应用 build 后的 `index.html` 用相对路径引用 assets, 否则部署到父项目容器后会找不到资源.

**改了 base 配置会导致父项目加载失败, 不要动**.

### 3. dev 端口 5273

[vite.config.ts](vite.config.ts) 写死 `server.port: 5273`. 父项目 [electron/env.ts](C:\Users\lsq\my-projects\electron-vite-project\electron\env.ts) 的 `getAppUrl()` 直接引用此端口. **改了端口必须同步父项目**.

## 常用开发命令

```bash
# 单独启动 (仅本子应用, 浏览器访问 http://localhost:5273)
pnpm dev

# 构建产物到 ./dist/
pnpm build

# 预览构建结果
pnpm preview
```

**和父项目联调**: 父项目 `pnpm dev` + 本项目 `pnpm dev` 必须同时运行. 父项目 `getAppUrl()` 会直接连本项目的 5273 端口.

**发布到父项目**: `pnpm build` 后把 `dist/` 拷贝到 `C:\Users\lsq\my-projects\electron-vite-project\apps\internal-app\dist\`.

## 改代码前自查清单

- [ ] 新增路由? 同步更新父项目书签栏 (如需快捷入口).
- [ ] 新增了 IPC 调用? 三处同步 (proxy / ipcMain / getModules).
- [ ] 改了端口或 base? 父项目 [electron/env.ts](C:\Users\lsq\my-projects\electron-vite-project\electron\env.ts) 会断链, 同步修改.
- [ ] 新增了顶层依赖? 父项目构建脚本可能需要同步; 当前两个项目的依赖基本独立, 不需要担心版本冲突.