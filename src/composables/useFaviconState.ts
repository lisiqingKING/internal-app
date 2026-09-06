import { ref } from 'vue'

export function useFaviconState() {
  const failedFavicons = ref<Set<string>>(new Set())

  function onFaviconError(url: string) {
    failedFavicons.value.add(url)
  }

  function onFaviconLoad(url: string) {
    failedFavicons.value.delete(url)
  }

  return { failedFavicons, onFaviconError, onFaviconLoad }
}
