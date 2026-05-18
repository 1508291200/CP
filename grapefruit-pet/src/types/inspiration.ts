// 灵感管理类型定义

export enum InspirationCategory {
  WORK = 'work',               // 工作相关
  PROJECT = 'project',         // 项目想法
  LEARNING = 'learning',       // 学习笔记
  LIFE = 'life',               // 生活灵感
  CREATIVE = 'creative',       // 创意点子
  TECHNICAL = 'technical',     // 技术方案
  DESIGN = 'design',           // 设计灵感
  BUSINESS = 'business',       // 商业想法
  RANDOM = 'random',           // 随机想法
  UNCATEGORIZED = 'uncategorized', // 未分类
}

export interface Inspiration {
  // 基础信息
  id: string;
  title?: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  
  // 分类信息
  category: InspirationCategory;
  tags: string[];
  
  // 状态
  favorite: boolean;
  archived: boolean;
  implemented: boolean;
  
  // 评分（可选）
  priority?: number; // 1-5
}

export interface FilterOptions {
  category?: InspirationCategory;
  tags?: string[];
  favorite?: boolean;
  archived?: boolean;
  implemented?: boolean;
  dateRange?: {
    start: number;
    end: number;
  };
}
