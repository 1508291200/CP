import { api } from './client'

export type SearchHitType = 'cp' | 'event' | 'milestone' | 'character'

export interface SearchHit {
  type:      SearchHitType
  id:        string
  cpId:      string | null
  title:     string
  subtitle?: string | null
  highlight?: string | null
  url:       string
}

export interface SearchResult {
  query:  string
  total:  number
  hits:   SearchHit[]
}

export const searchApi = {
  search: (q: string, cpId?: string) =>
    api.get<SearchResult>('/search', { q, ...(cpId ? { cpId } : {}) }),
}
