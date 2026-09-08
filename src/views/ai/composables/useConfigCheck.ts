import { ref } from 'vue'
import { useRouter } from 'vue-router'

export function useConfigCheck() {
  const noConfig = ref(false)
  const router = useRouter()

  async function checkConfig() {
    const ai = window.bridge.getModules(['ai']).ai
    const profile = await ai.getActiveProfile()
    noConfig.value = !profile || !profile.apiKey || !profile.apiUrl
  }

  function goToSettings() {
    router.push('/settings')
  }

  return {
    noConfig,
    checkConfig,
    goToSettings,
  }
}
