import apiClient from './client'
import type { ApiSuccess } from './client'

export interface MediaRecord {
  id:       string
  url:      string | null
  thumbUrl: string | null
  mimeType: string | null
  fileSize: number | null
}

export const mediaApi = {
  /** 上传图片，返回 MediaRecord */
  upload(file: File, onProgress?: (percent: number) => void): Promise<ApiSuccess<MediaRecord>> {
    const formData = new FormData()
    formData.append('file', file)

    return new Promise((resolve, reject) => {
      apiClient
        .post<ApiSuccess<MediaRecord>>('/api/v1/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress(e) {
            if (onProgress && e.total) {
              onProgress(Math.round((e.loaded / e.total) * 100))
            }
          },
        })
        .then((res) => resolve(res.data))
        .catch(reject)
    })
  },

  delete(id: string) {
    return apiClient.delete(`/api/v1/media/${id}`)
  },
}
