import { useRef, useEffect, useState } from 'react';
import Character from './components/Character';
import QuickInput from './components/QuickInput';
import InspirationLibrary from './components/InspirationLibrary';
import { useDrag } from './hooks/useDrag';
import { useCharacterStore } from './store';
import { useWaterReminderStore } from './store/waterReminderStore';
import { useInspirationStore } from './store/inspirationStore';
import './App.css';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  const { isDragging, handleMouseDown } = useDrag();
  const characterState = useCharacterStore((state) => state.state);
  const setState = useCharacterStore((state) => state.setState);
  
  const waterReminder = useWaterReminderStore();
  const { 
    isQuickInputVisible, 
    isLibraryVisible, 
    showQuickInput, 
    showLibrary 
  } = useInspirationStore();

  // 打开原生菜单
  const handleMenuClick = async () => {
    if (window.electronAPI) {
      await window.electronAPI.menu.show();
    }
  };

  // 监听状态变化和喝水事件
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onStateChange((state: string) => {
        setState(state);
      });
      
      window.electronAPI.onWaterDrink(() => {
        handleDrink();
      });
      
      window.electronAPI.onWaterSetInterval((minutes: number) => {
        waterReminder.setInterval(minutes);
      });
      
      window.electronAPI.onWaterToggle(() => {
        waterReminder.toggleEnabled();
      });
      
      // 灵感管理事件
      window.electronAPI.onShowQuickInput(() => {
        showQuickInput();
      });
      
      window.electronAPI.onShowLibrary(() => {
        showLibrary();
      });
      
      window.electronAPI.onSaveInspirationData((data: any) => {
        // 保存灵感数据
        const { addInspiration } = useInspirationStore.getState();
        addInspiration(data);
      });
      
      window.electronAPI.onRequestInspirationData((senderId: number) => {
        // 发送灵感数据给请求窗口
        const { inspirations } = useInspirationStore.getState();
        if (window.electronAPI) {
          window.electronAPI.sendInspirationData(senderId, inspirations);
        }
      });
      
      window.electronAPI.onToggleFavorite((id: string) => {
        const { toggleFavorite } = useInspirationStore.getState();
        toggleFavorite(id);
      });
    }
  }, [setState, waterReminder, showQuickInput, showLibrary]);

  // 计算剩余时间
  useEffect(() => {
    if (!waterReminder.enabled) {
      setTimeRemaining('');
      return;
    }

    const updateRemaining = () => {
      const now = Date.now();
      const timeSinceLastDrink = now - waterReminder.lastDrinkTime;
      const intervalMs = waterReminder.interval * 60 * 1000;
      const remaining = intervalMs - timeSinceLastDrink;

      if (remaining <= 0) {
        setTimeRemaining('💧');
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      
      if (minutes > 0) {
        setTimeRemaining(`${minutes}m`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [waterReminder.enabled, waterReminder.lastDrinkTime, waterReminder.interval]);

  // 喝水提醒逻辑
  useEffect(() => {
    if (!waterReminder.enabled) return;

    let lastNotificationTime = 0; // 记录上次通知时间

    const checkWaterReminder = () => {
      const now = Date.now();
      const timeSinceLastDrink = now - waterReminder.lastDrinkTime;
      const intervalMs = waterReminder.interval * 60 * 1000;

      // 检查是否在工作时间
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      const isWorkTime = 
        currentTimeStr >= waterReminder.workHours.start && 
        currentTimeStr <= waterReminder.workHours.end;

      if (isWorkTime && timeSinceLastDrink >= intervalMs) {
        // 超时后，每2分钟重复提醒一次
        const timeSinceLastNotification = now - lastNotificationTime;
        const repeatIntervalMs = 2 * 60 * 1000; // 2分钟

        if (lastNotificationTime === 0 || timeSinceLastNotification >= repeatIntervalMs) {
          // 显示系统通知
          if (window.electronAPI) {
            window.electronAPI.notification.show({
              title: '💧 喝水提醒',
              body: '该喝水啦~ 保持活力！',
            });
          }
          setState('thirsty');
          lastNotificationTime = now; // 更新最后通知时间
        }
      } else {
        // 未超时或不在工作时间，重置通知计时
        lastNotificationTime = 0;
      }
    };

    // 每10秒检查一次
    const interval = setInterval(checkWaterReminder, 10000);
    checkWaterReminder();

    return () => clearInterval(interval);
  }, [waterReminder.enabled, waterReminder.lastDrinkTime, waterReminder.interval, waterReminder.workHours, setState]);

  // 喝水确认
  const handleDrink = () => {
    waterReminder.markAsDrunk();
    setState('happy');
    setTimeout(() => setState('idle'), 2000);
  };

  return (
    <div className="app" ref={containerRef}>
      <div
        className={`character-container ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <Character state={characterState} onMenuClick={handleMenuClick} />
        
        {timeRemaining && (
          <div className="time-indicator">{timeRemaining}</div>
        )}
      </div>
      
      {/* 快速输入框 */}
      {isQuickInputVisible && <QuickInput />}
      
      {/* 灵感库 */}
      {isLibraryVisible && <InspirationLibrary />}
    </div>
  );
}

export default App;
