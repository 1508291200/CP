import { useEffect, useState } from 'react';
import { useInspirationStore } from '../store/inspirationStore';
import { Inspiration, InspirationCategory } from '../types/inspiration';
import './InspirationLibrary.css';

const CATEGORY_LABELS: Record<InspirationCategory, string> = {
  [InspirationCategory.WORK]: '工作',
  [InspirationCategory.PROJECT]: '项目',
  [InspirationCategory.LEARNING]: '学习',
  [InspirationCategory.LIFE]: '生活',
  [InspirationCategory.CREATIVE]: '创意',
  [InspirationCategory.TECHNICAL]: '技术',
  [InspirationCategory.DESIGN]: '设计',
  [InspirationCategory.BUSINESS]: '商业',
  [InspirationCategory.RANDOM]: '随机',
  [InspirationCategory.UNCATEGORIZED]: '未分类',
};

const InspirationLibrary: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    hideLibrary,
    getFilteredInspirations,
    toggleFavorite,
    toggleImplemented,
  } = useInspirationStore();

  const [filteredInspirations, setFilteredInspirations] = useState<Inspiration[]>([]);

  useEffect(() => {
    setFilteredInspirations(getFilteredInspirations());
  }, [searchQuery, getFilteredInspirations]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleFavoriteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleFavorite(id);
    setFilteredInspirations(getFilteredInspirations());
  };

  const handleImplementedClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleImplemented(id);
    setFilteredInspirations(getFilteredInspirations());
  };

  return (
    <div className="inspiration-library-overlay" onClick={hideLibrary}>
      <div className="inspiration-library" onClick={(e) => e.stopPropagation()}>
        <div className="library-header">
          <div className="library-title-row">
            <div className="library-title">
              <span>💡</span>
              <span>灵感库</span>
            </div>
            <button className="close-btn" onClick={hideLibrary}>
              ✕
            </button>
          </div>
          
          <div className="library-search">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 搜索灵感..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="library-stats">
            共 {filteredInspirations.length} 条灵感
          </div>
        </div>

        <div className="library-content">
          {filteredInspirations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💭</div>
              <div className="empty-text">
                {searchQuery ? '没有找到相关灵感' : '还没有记录任何灵感'}
              </div>
              <div className="empty-hint">
                {searchQuery ? '试试其他关键词' : '右键西柚 → 💡 灵感管理 → ✍️ 快速记录'}
              </div>
            </div>
          ) : (
            <div className="inspirations-grid">
              {filteredInspirations.map((inspiration) => (
                <div key={inspiration.id} className="inspiration-card">
                  <div className="card-header">
                    {inspiration.title ? (
                      <div className="card-title">{inspiration.title}</div>
                    ) : (
                      <div className="card-title" style={{ color: '#9ca3af' }}>
                        无标题
                      </div>
                    )}
                    <span
                      className="card-favorite"
                      onClick={(e) => handleFavoriteClick(e, inspiration.id)}
                    >
                      {inspiration.favorite ? '⭐' : '☆'}
                    </span>
                  </div>

                  <div className="card-content">{inspiration.content}</div>

                  {inspiration.tags.length > 0 && (
                    <div className="card-tags">
                      {inspiration.tags.map((tag) => (
                        <span key={tag} className="card-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="card-footer">
                    <span className="card-category">
                      {CATEGORY_LABELS[inspiration.category]}
                    </span>
                    <span className="card-date">
                      📅 {formatDate(inspiration.createdAt)}
                    </span>
                    <div className="card-status">
                      <span
                        onClick={(e) => handleImplementedClick(e, inspiration.id)}
                        style={{ cursor: 'pointer' }}
                        title={inspiration.implemented ? '已实现' : '未实现'}
                      >
                        {inspiration.implemented ? '✅' : '⭕'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspirationLibrary;
