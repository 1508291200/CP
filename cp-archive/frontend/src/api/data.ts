import apiClient from './client'
import { getAccessToken } from './client'

export type ImportMode = 'merge' | 'overwrite'

export interface ImportResult {
  mode:      ImportMode
  imported:  { cps: number; events: number; characters: number; milestones: number; tags: number }
  skipped:   number
  errors:    string[]
}

/** 全站导出，返回下载 URL（blob） */
export async function exportFull(): Promise<void> {
  const token = getAccessToken()
  const res = await apiClient.get('/api/v1/data/export/full', {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  triggerDownload(res.data, `cp-archive-full-${today()}.json`)
}

/** 单 CP 导出 */
export async function exportCp(cpId: string): Promise<void> {
  const token = getAccessToken()
  const res = await apiClient.get(`/api/v1/data/export/${cpId}`, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  triggerDownload(res.data, `cp-${cpId}-${today()}.json`)
}

/** 导入数据（JSON 文件） */
export async function importData(file: File, mode: ImportMode): Promise<ImportResult> {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiClient.post(`/api/v1/data/import?mode=${mode}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  return res.data.data as ImportResult
}

/** 危险：清空全站 */
export async function clearAllData(): Promise<void> {
  const token = getAccessToken()
  await apiClient.delete('/api/v1/data/data', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
