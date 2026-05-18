const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  window: {
    getPosition: () => ipcRenderer.invoke('window:getPosition'),
    setPosition: (x, y) => ipcRenderer.invoke('window:setPosition', x, y),
    getBounds: () => ipcRenderer.invoke('window:getBounds'),
  },
  
  // 菜单
  menu: {
    show: () => ipcRenderer.invoke('menu:show'),
  },
  
  // 应用控制
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
  },
  
  // 系统通知
  notification: {
    show: (options) => ipcRenderer.invoke('notification:show', options),
  },
  
  // 监听事件
  onStateChange: (callback) => {
    ipcRenderer.on('state:change', (_, state) => callback(state));
  },
  onWaterDrink: (callback) => {
    ipcRenderer.on('water:drink', () => callback());
  },
  onWaterSetInterval: (callback) => {
    ipcRenderer.on('water:setInterval', (_, minutes) => callback(minutes));
  },
  onWaterToggle: (callback) => {
    ipcRenderer.on('water:toggle', () => callback());
  },
  
  // 灵感管理事件
  onShowQuickInput: (callback) => {
    ipcRenderer.on('inspiration:showQuickInput', () => callback());
  },
  onShowLibrary: (callback) => {
    ipcRenderer.on('inspiration:showLibrary', () => callback());
  },
  onFocusSearch: (callback) => {
    ipcRenderer.on('inspiration:focusSearch', () => callback());
  },
  onSaveInspirationData: (callback) => {
    ipcRenderer.on('inspiration:saveData', (_, data) => callback(data));
  },
  onRequestInspirationData: (callback) => {
    ipcRenderer.on('inspiration:requestData', (_, senderId) => callback(senderId));
  },
  onToggleFavorite: (callback) => {
    ipcRenderer.on('inspiration:toggleFavorite', (_, id) => callback(id));
  },
  sendInspirationData: (senderId, data) => {
    ipcRenderer.send('inspiration:sendData', senderId, data);
  },
});
