import React from 'react';
import './Character.css';

interface CharacterProps {
  state: string;
  onMenuClick?: () => void;
}

const Character: React.FC<CharacterProps> = ({ state, onMenuClick }) => {
  return (
    <div className={`character character-${state}`}>
      {/* 西柚主体 */}
      <div className="grapefruit-body">
        {/* 果肉纹理 */}
        <div className="pulp pulp-1"></div>
        <div className="pulp pulp-2"></div>
        <div className="pulp pulp-3"></div>
        <div className="pulp pulp-4"></div>
        
        {/* 中心白色部分 */}
        <div className="center"></div>
        
        {/* 表情 */}
        <div className="face">
          <div className="eyes">
            <div className="eye eye-left"></div>
            <div className="eye eye-right"></div>
          </div>
          <div className="mouth"></div>
        </div>
        
        {/* 菜单按钮 */}
        {onMenuClick && (
          <button 
            className="menu-button"
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick();
            }}
            title="打开菜单"
          >
            ⋮
          </button>
        )}
      </div>
      
      {/* 顶部绿叶 */}
      <div className="leaf"></div>
    </div>
  );
};

export default Character;
