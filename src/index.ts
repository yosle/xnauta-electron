import {
  net,
  app,
  crashReporter,
  BrowserWindow,
  ipcMain,
  IpcMainEvent,
  dialog,
} from "electron";
import ElectronStore from "electron-store";

import Nauta from "./lib/nauta/Nauta";
import { CookieJar } from "tough-cookie";

crashReporter.start({ submitURL: "https://t.me/UtilesSaldo" });
// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Initialize
const store = new ElectronStore();
const cookieJar = new CookieJar();
const nauta = new Nauta(store, cookieJar);

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    show: false,
    height: 800,
    width: 600,
    maximizable: false,
    backgroundColor: "#1e1e1e",
    resizable: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.removeMenu();

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  app.whenReady().then(() => {
    ipcMain.on("login", handleLogin);
  });

  async function handleLogin(
    _event: IpcMainEvent,
    user: string,
    password: string
  ) {
    if (!net.isOnline) {
      dialog.showErrorBox("Error", "No se puede establecer la conexion.");
      return;
    }

    if (!user.includes("@nauta.co.cu") && !user.includes("@nauta.com.cu")) {
      console.log("Preguntando al usuario el tipo de cuenta");
      const resultClicked = dialog.showMessageBoxSync({
        type: "question",
        message: "Seleccione tipo de cuenta",
        buttons: ["Cuenta Internacional", "Cuenta Nacional", "Cancelar"],
        title: "Elija una de las opciones que se muestran abajo",
      });

      if (resultClicked == 0) {
        console.log("Seleccionado navegacion internacional");
        user += "@nauta.com.cu";
      }

      if (resultClicked == 1) {
        console.log("Seleccionado navegacion nacional");
        user += "@nauta.co.cu";
      }

      if (resultClicked == 2) {
        console.log("Seleccionado cancelar");
        return;
      }

      try {
        // show loading
        mainWindow.webContents.send("show_loading", true);

        const session = await nauta.login(user, password);
        if (!session) {
          dialog.showErrorBox("Error", `No se ha podido conectar`);
        }
        mainWindow.webContents.send("show_loading", false);

        // mainWindow.webContents.send("show_counter");
      } catch (error) {
        mainWindow.webContents.send("show_loading", false);
        dialog.showErrorBox("Error", `Error de conexion: ${error.message}`);
      }
      mainWindow.webContents.send("show-counter", { name: "Oleg" });
    }
  }
};

ipcMain.on("counter-value", (_event, value) => {
  console.log("ïn main process counter value", value); // will print value to Node console
});

ipcMain.on("synchronous-message", (event, arg) => {
  console.log(arg); // prints "ping" in the Node console
  event.returnValue = "pong";
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
