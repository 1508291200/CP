import React from 'react';
import { useCharacterStore } from '../store';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose }) => {
  const setState = useCharacterStore((state) => state.setState);

  const handleStateChange = (newState: string) => {
    setState(newState);
    onClose();
  };

  const handleQuit = async () => {
    if (window.electronAPI) {
      await window.electronAPI.app.quit();
    }
  };

  return (
    <div
      className="context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="menu-header">🍊 西柚桌宠</div>
      
      <div className="menu-divider"></div>
      
      <div className="menu-section">
        <div className="menu-label">切换状态</div>
        <button
          className="menu-item"
          onClick={() => handleStateChange('happy')}
        >
          😊 开心
        </button>
        <button
          className="menu-item"
          onClick={() => handleStateChange('work')}
        >
          💼 工作
        </button>
        <button
          className="menu-item"
          onClick={() => handleStateChange('sleep')}
        >
          😴 休息
        </button>
        <button
          className="menu-item"
          onClick={() => handleStateChange('idle')}
        >
          🌸 待机
        </button>
      </div>
      
      <div className="menu-divider"></div>
      
      <button className="menu-item" onClick={handleQuit}>
        🚪 退出
      </button>
    </div>
  );
};

export default ContextMenu;
