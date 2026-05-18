import { useState, useEffect, useRef } from 'react';
import { useInspirationStore } from '../store/inspirationStore';
import { InspirationClassifier, TagExtractor } from '../services/inspirationClassifier';
import { InspirationCategory } from '../types/inspiration';
import './QuickInput.css';

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

const QuickInput: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState<InspirationCategory>(InspirationCategory.UNCATEGORIZED);
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const classifier = useRef(new InspirationClassifier());
  const tagExtractor = useRef(new TagExtractor());
  
  const { addInspiration, hideQuickInput } = useInspirationStore();

  // 自动聚焦
  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  // 实时分析内容
  useEffect(() => {
    if (content) {
      // 提取标签
      const extractedTags = tagExtractor.current.extract(content);
      setTags(extractedTags);
      
      // 自动分类
      const detectedCategory = classifier.current.classify(content, extractedTags);
      setCategory(detectedCategory);
    } else {
      setTags([]);
      setCategory(InspirationCategory.UNCATEGORIZED);
    }
  }, [content]);

  const handleSave = () => {
    if (!content.trim()) {
      contentRef.current?.focus();
      return;
    }

    addInspiration({
      title: title.trim() || undefined,
      content: content.trim(),
      tags,
      category,
    });

    // 清空表单
    setTitle('');
    setContent('');
    setTags([]);
    setCategory(InspirationCategory.UNCATEGORIZED);
    
    hideQuickInput();
  };

  const handleCancel = () => {
    hideQuickInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <div className="quick-input-overlay" onClick={handleCancel}>
      <div className="quick-input" onClick={(e) => e.stopPropagation()}>
        <div className="quick-input-header">
          <span className="quick-input-icon">💡</span>
          <h3 className="quick-input-title">快速记录灵感</h3>
        </div>
        
        <div className="quick-input-form">
          <div className="input-field">
            <label className="input-label">标题（可选）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="为你的灵感取个名字..."
              onKeyDown={handleKeyDown}
            />
          </div>
          
          <div className="input-field">
            <label className="input-label">内容 *</label>
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="记录你的想法... 支持 #标签"
              onKeyDown={handleKeyDown}
            />
            <div className="char-count">{content.length} 字</div>
          </div>
          
          {tags.length > 0 && (
            <div className="input-field">
              <label className="input-label">🏷️ 自动识别标签</label>
              <div className="tags-display">
                {tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {category !== InspirationCategory.UNCATEGORIZED && (
            <div className="input-field">
              <label className="input-label">📂 自动分类</label>
              <div className="category-badge">
                {CATEGORY_LABELS[category]}
              </div>
            </div>
          )}
          
          <div className="hint-text">
            💡 提示：在内容中使用 #标签 可以快速添加标签
          </div>
        </div>
        
        <div className="quick-input-actions">
          <button className="btn-cancel" onClick={handleCancel}>
            ✖ 取消
          </button>
          <button className="btn-save" onClick={handleSave}>
            💾 保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickInput;
