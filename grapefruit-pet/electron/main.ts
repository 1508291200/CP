import { app, BrowserWindow, Tray, Menu, ipcMain, screen, Notification, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let menuWindow: BrowserWindow | null = null;
let inspirationWindow: BrowserWindow | null = null;
let libraryWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// 窗口配置 - 小巧简洁
const WINDOW_CONFIG = {
  width: 100,   // 小窗口宽度
  height: 120,  // 小窗口高度
  minWidth: 80,
  minHeight: 100,
};

function createWindow() {
  // 获取屏幕尺寸
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  // 默认位置：屏幕右下角
  const defaultX = screenWidth - WINDOW_CONFIG.width - 20;
  const defaultY = screenHeight - WINDOW_CONFIG.height - 20;

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.width,
    height: WINDOW_CONFIG.height,
    x: defaultX,
    y: defaultY,
    transparent: true,       // 透明窗口
    frame: false,            // 无边框
    alwaysOnTop: true,       // 始终置顶
    resizable: false,        // 不可调整大小
    skipTaskbar: true,       // 不显示在任务栏
    hasShadow: false,        // 无阴影
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // 开发模式：加载 Vite 开发服务器
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools({ mode: 'detach' }); // 开发者工具（已禁用）
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 防止窗口被拖出屏幕（在 IPC 中处理，避免冲突）
  // mainWindow.on('moved', () => {
  //   if (!mainWindow) return;
  //   
  //   const [x, y] = mainWindow.getPosition();
  //   const bounds = screen.getPrimaryDisplay().workAreaSize;
  //   
  //   let newX = x;
  //   let newY = y;
  //   
  //   // 限制在屏幕范围内
  //   if (x < 0) newX = 0;
  //   if (y < 0) newY = 0;
  //   if (x + WINDOW_CONFIG.width > bounds.width) {
  //     newX = bounds.width - WINDOW_CONFIG.width;
  //   }
  //   if (y + WINDOW_CONFIG.height > bounds.height) {
  //     newY = bounds.height - WINDOW_CONFIG.height;
  //   }
  //   
  //   if (newX !== x || newY !== y) {
  //     mainWindow.setPosition(newX, newY);
  //   }
  // });
}

// 创建灵感输入窗口
function createInspirationWindow() {
  if (inspirationWindow) {
    inspirationWindow.focus();
    return;
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  // 窗口尺寸
  const windowWidth = 1400;
  const windowHeight = 700;
  
  // 居中显示
  const x = Math.round((screenWidth - windowWidth) / 2);
  const y = Math.round((screenHeight - windowHeight) / 2);

  inspirationWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // 加载独立的HTML文件
  inspirationWindow.loadFile(path.join(__dirname, '../inspiration-input.html'));

  // 准备好后显示
  inspirationWindow.once('ready-to-show', () => {
    inspirationWindow?.show();
  });

  // 关闭时清理引用
  inspirationWindow.on('closed', () => {
    inspirationWindow = null;
  });
}

// 创建灵感库窗口
function createLibraryWindow() {
  if (libraryWindow) {
    libraryWindow.focus();
    return;
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  const windowWidth = 1200;
  const windowHeight = 800;
  
  const x = Math.round((screenWidth - windowWidth) / 2);
  const y = Math.round((screenHeight - windowHeight) / 2);

  libraryWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x, y,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  libraryWindow.loadFile(path.join(__dirname, '../inspiration-library.html'));

  libraryWindow.once('ready-to-show', () => {
    libraryWindow?.show();
  });

  libraryWindow.on('closed', () => {
    libraryWindow = null;
  });
}

function createTray() {
  // 创建系统托盘图标（需要图标文件）
  const iconPath = path.join(__dirname, '../assets/icons/tray.png');
  
  // 如果图标文件不存在，暂时不创建托盘
  // tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🍊 西柚桌宠',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '💡 灵感管理',
      submenu: [
        {
          label: '✍️ 快速记录',
          click: () => {
            createInspirationWindow();
          },
        },
        {
          label: '📚 浏览灵感库',
          click: () => {
            createLibraryWindow();
          },
        },
        {
          label: '🔍 搜索灵感',
          click: () => {
            createLibraryWindow();
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: '显示/隐藏',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);
  
  // tray.setContextMenu(contextMenu);
  // tray.setToolTip('西柚桌宠');
}

// IPC 通信处理
ipcMain.handle('window:getPosition', () => {
  if (!mainWindow) return { x: 0, y: 0 };
  const [x, y] = mainWindow.getPosition();
  console.log('[主进程] 获取位置:', { x, y });
  return { x, y };
});

ipcMain.handle('window:setPosition', (_, x: number, y: number) => {
  if (mainWindow) {
    console.log('[主进程] 设置位置:', { x, y });
    
    // 限制在屏幕范围内
    const bounds = screen.getPrimaryDisplay().workAreaSize;
    const limitedX = Math.max(0, Math.min(x, bounds.width - WINDOW_CONFIG.width));
    const limitedY = Math.max(0, Math.min(y, bounds.height - WINDOW_CONFIG.height));
    
    mainWindow.setPosition(Math.round(limitedX), Math.round(limitedY));
  }
});

ipcMain.handle('window:getBounds', () => {
  if (!mainWindow) return { x: 0, y: 0, width: 0, height: 0 };
  return mainWindow.getBounds();
});

// 显示系统通知
ipcMain.handle('notification:show', (_, options: { title: string; body: string }) => {
  const notification = new Notification({
    title: options.title,
    body: options.body,
    icon: process.platform === 'darwin' ? undefined : path.join(__dirname, '../assets/icons/icon.png'),
    silent: false,
  });
  
  // 点击通知时，标记已喝水
  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.webContents.send('water:drink');
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  notification.show();
});

// 显示原生菜单
ipcMain.handle('menu:show', async () => {
  if (!mainWindow) return;
  
  // 确保窗口已经准备好
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // 获取最新的窗口位置
  const bounds = mainWindow.getBounds();
  const position = mainWindow.getPosition();
  
  console.log('[主进程] 菜单请求 - 窗口bounds:', bounds);
  console.log('[主进程] 菜单请求 - 窗口position:', position);
  
  const template: any[] = [
    {
      label: '🍊 西柚桌宠',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '切换状态',
      submenu: [
        {
          label: '😊 开心',
          click: () => {
            mainWindow?.webContents.send('state:change', 'happy');
          },
        },
        {
          label: '💼 工作',
          click: () => {
            mainWindow?.webContents.send('state:change', 'work');
          },
        },
        {
          label: '😴 休息',
          click: () => {
            mainWindow?.webContents.send('state:change', 'sleep');
          },
        },
        {
          label: '🌸 待机',
          click: () => {
            mainWindow?.webContents.send('state:change', 'idle');
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: '💧 喝水提醒',
      submenu: [
        {
          label: '✓ 已喝水（重置计时）',
          click: () => {
            mainWindow?.webContents.send('water:drink');
          },
        },
        { type: 'separator' },
        {
          label: '⚙️ 设置提醒间隔',
          submenu: [
            {
              label: '30 分钟',
              click: () => {
                mainWindow?.webContents.send('water:setInterval', 30);
              },
            },
            {
              label: '60 分钟',
              click: () => {
                mainWindow?.webContents.send('water:setInterval', 60);
              },
            },
            {
              label: '90 分钟',
              click: () => {
                mainWindow?.webContents.send('water:setInterval', 90);
              },
            },
            {
              label: '120 分钟',
              click: () => {
                mainWindow?.webContents.send('water:setInterval', 120);
              },
            },
            { type: 'separator' },
            {
              label: '⌨️ 自定义时间...',
              click: async () => {
                const { BrowserWindow } = require('electron');
                const inputWindow = new BrowserWindow({
                  width: 400,
                  height: 200,
                  modal: true,
                  parent: mainWindow!,
                  webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                  },
                  frame: true,
                  resizable: false,
                  title: '自定义提醒间隔',
                });

                const html = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="UTF-8">
                    <style>
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        padding: 30px;
                        margin: 0;
                        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
                      }
                      .container {
                        background: white;
                        padding: 20px;
                        border-radius: 12px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                      }
                      h3 {
                        margin: 0 0 15px 0;
                        color: #1976d2;
                        font-size: 16px;
                      }
                      .input-group {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 20px;
                      }
                      input {
                        flex: 1;
                        padding: 8px 12px;
                        border: 2px solid #90caf9;
                        border-radius: 6px;
                        font-size: 14px;
                        outline: none;
                      }
                      input:focus {
                        border-color: #2196f3;
                      }
                      .unit {
                        color: #666;
                        font-size: 14px;
                      }
                      .buttons {
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                      }
                      button {
                        padding: 8px 20px;
                        border: none;
                        border-radius: 6px;
                        font-size: 13px;
                        cursor: pointer;
                        font-weight: 500;
                      }
                      .btn-cancel {
                        background: #f5f5f5;
                        color: #666;
                      }
                      .btn-cancel:hover {
                        background: #e0e0e0;
                      }
                      .btn-ok {
                        background: #2196f3;
                        color: white;
                      }
                      .btn-ok:hover {
                        background: #1976d2;
                      }
                      .error {
                        color: #f44336;
                        font-size: 12px;
                        margin-top: 5px;
                        display: none;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h3>💧 设置提醒间隔</h3>
                      <div class="input-group">
                        <input type="number" id="minutes" min="1" max="600" value="60" placeholder="请输入分钟数" autofocus>
                        <span class="unit">分钟</span>
                      </div>
                      <div class="error" id="error">请输入1-600之间的数字</div>
                      <div class="buttons">
                        <button class="btn-cancel" onclick="cancel()">取消</button>
                        <button class="btn-ok" onclick="confirm()">确定</button>
                      </div>
                    </div>
                    <script>
                      const { ipcRenderer } = require('electron');
                      const input = document.getElementById('minutes');
                      const error = document.getElementById('error');

                      input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') confirm();
                        if (e.key === 'Escape') cancel();
                      });

                      input.addEventListener('input', () => {
                        error.style.display = 'none';
                      });

                      function cancel() {
                        window.close();
                      }

                      function confirm() {
                        const value = parseInt(input.value);
                        if (isNaN(value) || value < 1 || value > 600) {
                          error.style.display = 'block';
                          input.focus();
                          return;
                        }
                        ipcRenderer.send('custom-interval-set', value);
                        window.close();
                      }

                      input.select();
                    </script>
                  </body>
                  </html>
                `;

                inputWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
              },
            },
          ],
        },
        { type: 'separator' },
        {
          label: '🔕 关闭提醒',
          click: () => {
            mainWindow?.webContents.send('water:toggle');
          },
        },
      ],
    },
    { type: 'separator' },
    {
      label: '🚪 退出',
      click: () => {
        app.quit();
      },
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  
  // 不传 window 参数，这样 x, y 就是屏幕绝对坐标
  const menuX = position[0] + bounds.width + 5;
  const menuY = position[1];
  
  console.log('[主进程] 菜单位置（屏幕坐标）:', { x: menuX, y: menuY });
  
  menu.popup({
    x: menuX,
    y: menuY,
  });
});

ipcMain.handle('app:quit', () => {
  app.quit();
});

// 监听自定义间隔设置
ipcMain.on('custom-interval-set', (_, minutes: number) => {
  if (mainWindow) {
    mainWindow.webContents.send('water:setInterval', minutes);
  }
});

// 监听灵感保存
ipcMain.on('inspiration:save', (_, data) => {
  console.log('[主进程] 保存灵感:', data);
  
  // 转发给主窗口保存
  if (mainWindow) {
    mainWindow.webContents.send('inspiration:saveData', data);
  }
});

// 灵感库请求数据
ipcMain.on('inspiration:requestData', (event) => {
  console.log('[主进程] 请求灵感数据');
  
  // 请求主窗口发送数据
  if (mainWindow) {
    mainWindow.webContents.send('inspiration:requestData', event.sender.id);
  }
});

// 主窗口发送数据给灵感库
ipcMain.on('inspiration:sendData', (_, senderId, data) => {
  const targetWindow = BrowserWindow.getAllWindows().find(
    w => w.webContents.id === senderId
  );
  
  if (targetWindow) {
    targetWindow.webContents.send('inspiration:data', data);
  }
});

// 切换收藏
ipcMain.on('inspiration:toggleFavorite', (_, id) => {
  if (mainWindow) {
    mainWindow.webContents.send('inspiration:toggleFavorite', id);
  }
  
  // 刷新灵感库
  if (libraryWindow) {
    mainWindow?.webContents.send('inspiration:requestData', libraryWindow.webContents.id);
  }
});

// 应用生命周期
app.whenReady().then(() => {
  createWindow();
  // createTray(); // 托盘图标暂时注释
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 防止多开
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
