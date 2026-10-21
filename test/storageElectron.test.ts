import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ElectronAPIModule } from '../src/types/electron'

const list = vi.fn()
const listCategories = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  window.electronApis = {
    ai: { list, listCategories } as unknown as ElectronAPIModule,
  }
})

const { initElectronStorage, electronStorageAdapter } = await import(
  '../src/views/ai/composables/storage/storageElectron'
)

describe('storageElectron 全量加载', () => {
  it('拉会话列表时不带分页参数', async () => {
    list.mockResolvedValue([])
    listCategories.mockResolvedValue([])

    await initElectronStorage()

    expect(list).toHaveBeenCalledWith()
  })

  it('分组与全部分组下的会话一次拿全', async () => {
    const sessions = Array.from({ length: 30 }, (_, i) => ({
      convId: `c${i}`,
      title: `会话${i}`,
      categoryId: i % 3 === 0 ? 'cat-1' : null,
    }))
    list.mockResolvedValue(sessions)
    listCategories.mockResolvedValue([{ id: 'cat-1', name: '工作', ord: 0 }])

    await initElectronStorage()
    const cached = await electronStorageAdapter.readAll()

    expect(cached).toHaveLength(30)
    expect(cached.filter((s) => s.categoryId === 'cat-1')).toHaveLength(10)
  })
})
