import { useState, useEffect } from 'react';
import { useWaterReminderStore } from '../store/waterReminderStore';
import './WaterReminder.css';

interface WaterReminderProps {
  onDrink: () => void;
  onSnooze: () => void;
}

const WaterReminder: React.FC<WaterReminderProps> = ({ onDrink, onSnooze }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 显示动画
    setTimeout(() => setVisible(true), 10);
  }, []);

  const handleDrink = () => {
    setVisible(false);
    setTimeout(onDrink, 300);
  };

  const handleSnooze = () => {
    setVisible(false);
    setTimeout(onSnooze, 300);
  };

  const messages = [
    '该喝水啦~ 💧',
    '补充水分，保持活力！',
    '一起喝杯水吧~',
    '别忘了喝水哦~',
    '喝水时间到！',
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return (
    <div className={`water-reminder ${visible ? 'visible' : ''}`}>
      <div className="reminder-icon">💧</div>
      <div className="reminder-message">{randomMessage}</div>
      <div className="reminder-buttons">
        <button className="btn-drink" onClick={handleDrink}>
          已喝水 ✓
        </button>
        <button className="btn-snooze" onClick={handleSnooze}>
          10分钟后提醒
        </button>
      </div>
    </div>
  );
};

export default WaterReminder;
