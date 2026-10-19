import { test, expect } from '@playwright/test'

test.describe('侧边栏功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/ai')
    // 等待页面加载
    await page.waitForSelector('.sidebar', { timeout: 10000 })
  })

  test('侧边栏正常显示', async ({ page }) => {
    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.locator('.sidebar-header')).toBeVisible()
    await expect(page.locator('.session-list')).toBeVisible()
  })

  test('新建对话按钮可见', async ({ page }) => {
    const newChatBtn = page.locator('.new-chat-btn')
    await expect(newChatBtn).toBeVisible()
    await expect(newChatBtn).toContainText('新对话')
  })

  test('点击新建对话，创建新会话', async ({ page }) => {
    const newChatBtn = page.locator('.new-chat-btn')
    await newChatBtn.click()

    // 等待工具栏出现（表示进入了新会话）
    await expect(page.locator('.top-toolbar')).toBeVisible()
  })

  test('点击菜单按钮，展开下拉菜单', async ({ page }) => {
    const menuBtn = page.locator('.menu-btn')
    await menuBtn.click()

    await expect(page.locator('.dropdown-menu')).toBeVisible()
    await expect(page.locator('.dropdown-item').first()).toBeVisible()
  })

  test('下拉菜单包含"新建分组"和"搜索会话"选项', async ({ page }) => {
    await page.locator('.menu-btn').click()

    const items = page.locator('.dropdown-item')
    await expect(items).toHaveCount(2)
    await expect(items.nth(0)).toContainText('新建分组')
    await expect(items.nth(1)).toContainText('搜索会话')
  })

  test('点击菜单外区域，关闭下拉菜单', async ({ page }) => {
    await page.locator('.menu-btn').click()
    await expect(page.locator('.dropdown-menu')).toBeVisible()

    await page.locator('.menu-overlay').click()
    await expect(page.locator('.dropdown-menu')).not.toBeVisible()
  })

  test('点击折叠按钮，侧边栏收起', async ({ page }) => {
    const collapseBtn = page.locator('.collapse-btn')
    await collapseBtn.click()

    // 侧边栏宽度变为 0
    const sidebarWrapper = page.locator('.sidebar-wrapper')
    await expect(sidebarWrapper).toHaveClass(/collapsed/)
  })

  test('再次点击折叠按钮，侧边栏展开', async ({ page }) => {
    // 先折叠
    await page.locator('.collapse-btn').click()
    await expect(page.locator('.sidebar-wrapper')).toHaveClass(/collapsed/)

    // 再展开（按钮可能被遮挡，用 force）
    await page.locator('.collapse-btn').click({ force: true })
    await expect(page.locator('.sidebar-wrapper')).not.toHaveClass(/collapsed/)
  })
})
