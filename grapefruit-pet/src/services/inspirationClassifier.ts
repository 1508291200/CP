import { InspirationCategory } from '../types/inspiration';

// 关键词字典
const KEYWORDS_MAP: Record<InspirationCategory, string[]> = {
  [InspirationCategory.WORK]: [
    '会议', '任务', '工作', '项目进度', '汇报', 'deadline', '计划', '安排', '待办',
    'meeting', 'task', 'work', 'deadline', 'schedule'
  ],
  [InspirationCategory.PROJECT]: [
    '想做', '开发', '项目', '功能', '产品', '实现', '需求', '方案',
    'develop', 'project', 'feature', 'product', 'implement'
  ],
  [InspirationCategory.LEARNING]: [
    '学习', '笔记', '理解', '掌握', '教程', '知识点', '总结', '复习',
    'learn', 'study', 'note', 'tutorial', 'knowledge'
  ],
  [InspirationCategory.TECHNICAL]: [
    '代码', '算法', '架构', '优化', 'bug', '方案', '技术', '性能', '重构',
    'code', 'algorithm', 'architecture', 'optimize', 'refactor', 'performance'
  ],
  [InspirationCategory.DESIGN]: [
    '设计', 'UI', 'UX', '界面', '交互', '视觉', '配色', '布局', '原型',
    'design', 'interface', 'visual', 'layout', 'prototype', 'color'
  ],
  [InspirationCategory.CREATIVE]: [
    '创意', '点子', '灵感', '想法', '脑洞', '创新', '有趣',
    'creative', 'idea', 'inspiration', 'innovation', 'interesting'
  ],
  [InspirationCategory.BUSINESS]: [
    '商业', '盈利', '营销', '推广', '运营', '变现', '市场',
    'business', 'profit', 'marketing', 'promotion', 'market'
  ],
  [InspirationCategory.LIFE]: [
    '生活', '日常', '感悟', '心情', '记录', '分享', '经验',
    'life', 'daily', 'mood', 'experience', 'share'
  ],
  [InspirationCategory.RANDOM]: [
    '随便', '随手', '临时', '突然想到',
    'random', 'casual', 'suddenly'
  ],
  [InspirationCategory.UNCATEGORIZED]: [],
};

/**
 * 智能分类器
 */
export class InspirationClassifier {
  /**
   * 自动分类灵感
   */
  classify(content: string, tags: string[] = []): InspirationCategory {
    const scores = this.calculateScores(content, tags);
    
    // 找到得分最高的分类
    const sortedCategories = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);
    
    if (sortedCategories.length === 0 || sortedCategories[0][1] === 0) {
      return InspirationCategory.UNCATEGORIZED;
    }
    
    return sortedCategories[0][0] as InspirationCategory;
  }
  
  /**
   * 计算各分类的得分
   */
  private calculateScores(content: string, tags: string[]): Record<string, number> {
    const scores: Record<string, number> = {};
    const lowerContent = content.toLowerCase();
    
    // 1. 基于内容关键词匹配（70%权重）
    Object.entries(KEYWORDS_MAP).forEach(([category, keywords]) => {
      let score = 0;
      keywords.forEach((keyword) => {
        if (lowerContent.includes(keyword.toLowerCase())) {
          score += 1;
        }
      });
      scores[category] = score * 0.7;
    });
    
    // 2. 基于标签匹配（30%权重）
    if (tags.length > 0) {
      tags.forEach((tag) => {
        const lowerTag = tag.toLowerCase();
        Object.entries(KEYWORDS_MAP).forEach(([category, keywords]) => {
          keywords.forEach((keyword) => {
            if (lowerTag.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(lowerTag)) {
              scores[category] = (scores[category] || 0) + 0.3;
            }
          });
        });
      });
    }
    
    return scores;
  }
}

/**
 * 标签提取器
 */
export class TagExtractor {
  private techKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust',
    'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js',
    'AI', 'ML', '机器学习', '深度学习', 'ChatGPT',
    '前端', '后端', '全栈', '算法', '数据结构', '数据库',
    'Electron', 'Vite', 'Webpack', 'Git', 'Docker',
  ];
  
  /**
   * 从内容中提取标签
   */
  extract(content: string): string[] {
    const tags: string[] = [];
    
    // 1. 识别 #标签
    const hashTags = content.match(/#[\u4e00-\u9fa5\w]+/g);
    if (hashTags) {
      tags.push(...hashTags.map((t) => t.slice(1)));
    }
    
    // 2. 提取技术关键词
    this.techKeywords.forEach((keyword) => {
      if (content.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    // 去重
    return [...new Set(tags)];
  }
}
