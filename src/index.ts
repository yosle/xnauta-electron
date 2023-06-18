import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';


// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}



const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    show:false,
    height: 600,
    width: 400,
    maximizable: false,
    backgroundColor: '#1e1e1e',
    resizable: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false
    },
  
  });

  mainWindow.removeMenu();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

function handleLogin(event: IpcMainEvent, user: string, password: string){
 console.log("esta es mi funcion", user, password);
}

ipcMain.on('synchronous-message', (event, arg) => {
  console.log(arg) // prints "ping" in the Node console
  event.returnValue = 'pong'
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

app.whenReady().then(() => {
  ipcMain.on('on-handleLogin', handleLogin);
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
