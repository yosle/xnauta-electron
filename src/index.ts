import {
  net,
  app,
  crashReporter,
  BrowserWindow,
  ipcMain,
  IpcMainEvent,
  dialog,
  Notification,
  Tray,
  Menu,
  nativeTheme,
  nativeImage,
} from "electron";
import ElectronStore from "electron-store";
import path from "path";
import minimist from "minimist";

import Nauta from "./lib/nauta/Nauta";
import Session from "./lib/nauta/Session";
import { CookieJar } from "tough-cookie";

crashReporter.start({ submitURL: "https://t.me/UtilesSaldo" });
// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
const APP_VERSION_NUMBER = "0.0.1";
const NOTIFICATION_TITLE = "X Nauta";
const args = minimist(process.argv.slice(1));
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

if (args.version) {
  console.log(APP_VERSION_NUMBER);
  app.quit();
}

// Initialize
const store = new ElectronStore();
const cookieJar = new CookieJar();
const nauta = new Nauta(store, cookieJar);

let isQuitting = false;
let isSessionActive = false;

// assets path is different once app is packed!
const iconPath = app.isPackaged
  ? path.join(__dirname, "..", "..", "..", "xnauta.png")
  : path.join("src", "assets", "xnauta.png");
const icon = nativeImage.createFromPath(iconPath);

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    icon: icon,
    show: false,
    height: 400,
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

  Menu.setApplicationMenu(null);
  mainWindow.removeMenu();
  nativeTheme.themeSource = "dark";

  const tray = new Tray(icon);
  // TODO: refractor tray menu logic later

  const contextMenuConnected = Menu.buildFromTemplate([
    {
      label: "Mostar/Ocultar",
      type: "normal",
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow?.hide();
        } else {
          mainWindow?.show();
        }
      },
    },
    {
      label: "Actualizar tiempo",
      type: "normal",
      click: () => handleUpdateCounter(),
      visible: isSessionActive,
    },
    { label: "---", type: "separator" },
    {
      label: "Desconectar",
      type: "normal",
      click: () => handleSessionLogout(),
      visible: isSessionActive,
    },
    {
      label: "Salir",
      type: "normal",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    checkPreviousSession();
  });
  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      new Notification({
        title: NOTIFICATION_TITLE,
        icon: icon,
        body: "XNauta esta corriendo en segundo plano. Click en la tray bar para ver opciones",
      }).show();
    }
  });

  mainWindow.on("minimize", (event: IpcMainEvent) => {
    event.preventDefault();
    mainWindow?.hide();
    new Notification({
      title: NOTIFICATION_TITLE,
      icon: icon,
      body: "XNauta esta corriendo en segundo plano. Click en la tray bar para ver opciones",
    }).show();
  });

  app.whenReady().then(() => {
    ipcMain.on("login", handleLogin);
    ipcMain.on("session_logout", handleSessionLogout);
    ipcMain.on("update_counter", handleUpdateCounter);

    tray.setToolTip(`XNauta ${APP_VERSION_NUMBER}`);
    tray.setContextMenu(contextMenuConnected);

    // Windows only
    tray.on("double-click", () => {
      mainWindow?.show();
    });

    // Call this again for Linux because we modified the context menu
    contextMenuConnected.items[1].visible = false;
    contextMenuConnected.items[3].visible = false;
    tray.setContextMenu(contextMenuConnected);
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
    if (user.length == 0 || password.length == 0) {
      dialog.showErrorBox("Error", `Debe escribir el usuario y la contraseña`);
      return;
    }
    if (!user.includes("@nauta.co.cu") && !user.includes("@nauta.com.cu")) {
      const resultClicked = dialog.showMessageBoxSync({
        type: "question",
        message: "Seleccione tipo de cuenta",
        buttons: ["Cuenta Internacional", "Cuenta Nacional", "Cancelar"],
        title: "Elija una de las opciones que se muestran abajo",
      });

      if (resultClicked == 0) user += "@nauta.com.cu";
      if (resultClicked == 1) user += "@nauta.co.cu";
      if (resultClicked == 2) return;
    }

    try {
      mainWindow.webContents.send("show_loading", true);
      const session = await nauta.login(user, password);
      if (!session || session instanceof Error) {
        dialog.showErrorBox(
          "Error de conexión",
          `No se ha podido conectar con ETECSA. Comprueba que no estas usando un VPN o estas detrás de un proxy.`
        );
        mainWindow.webContents.send("show_loading", false);
        return;
      }
      const { username, uuid } = session;
      const sessionHandler = new Session({
        username,
        uuid,
      });
      const time = await sessionHandler.getRemainingTime();
      if (!time || time instanceof Error) {
        mainWindow.webContents.send("show_loading", false);
        mainWindow.webContents.send("show_login");
        isSessionActive = true;
        dialog.showErrorBox("Error", `No se ha podido iniciar sesion`);
        return;
      }
      mainWindow.webContents.send("show_loading", false);
      console.log("TIEMPO RESTANTE: ", time);
      mainWindow.webContents.send("show_counter", time);
      contextMenuConnected.items[1].visible = true;
      contextMenuConnected.items[3].visible = true;
      tray.setContextMenu(contextMenuConnected);
    } catch (error) {
      isSessionActive = false;
      mainWindow.webContents.send("show_loading", false);
      dialog.showErrorBox("Error", `Error de conexion: ${error.message}`);
    }
  }

  async function handleSessionLogout() {
    isSessionActive = false;
    contextMenuConnected.items[1].visible = false;
    contextMenuConnected.items[3].visible = false;
    tray.setContextMenu(contextMenuConnected);

    mainWindow.webContents.send("show_loading", true);
    const username = (await store.get("username")) as string;
    const uuid = (await store.get("uuid")) as string;
    if (!username || !uuid) {
      dialog.showErrorBox("Error", "No se encontro ninguna sesion guardada.");
      return;
    }

    const sessionHandler = new Session({
      username,
      uuid,
    });
    const result = await sessionHandler.logout();
    if (!result) {
      mainWindow.webContents.send("show_loading", true);
      dialog.showErrorBox(
        "Error",
        "No se puedo cerrar sesion de forma segura. Desconecte su dispositivo de la red WiFi"
      );
    } else {
      store.clear();
      mainWindow.webContents.send("show_loading", false);

      new Notification({
        title: NOTIFICATION_TITLE,
        body: "Sesion cerrada con exito",
      }).show();
      mainWindow.webContents.send("show_login");
    }
  }

  async function checkPreviousSession() {
    console.log("CHECK PREVIOUS SESSION");
    mainWindow.webContents.send("show_loading", true);
    const username = (await store.get("username")) as string;
    const uuid = (await store.get("uuid")) as string;

    if (!!username && !!uuid) {
      console.log("RETRIEVE PREVIOUS SESSION");
      const retrieveSession = dialog.showMessageBoxSync({
        type: "question",
        message: `Hay una session guardada en la aplicacion de la ultima vez que se uso. 
          Desea intentar recuperarla? Toque No para iniciar con otra cuenta.`,
        buttons: ["Si", "No"],
        title: "Recuperar sesion",
      });

      if (retrieveSession == 0) {
        const sessionHandler = new Session({
          username,
          uuid,
        });
        try {
          const time = await sessionHandler.getRemainingTime();
          console.log("REMANING TIME", time);
          contextMenuConnected.items[1].visible = true;
          contextMenuConnected.items[3].visible = true;
          tray.setContextMenu(contextMenuConnected);

          const NOTIFICATION_BODY = `Sesión ${username} recuperada con éxito`;

          new Notification({
            title: NOTIFICATION_TITLE,
            body: NOTIFICATION_BODY,
          }).show();
          isSessionActive = true;
          mainWindow.webContents.send("show_counter", time);
        } catch (error) {
          isSessionActive = false;
          console.log("Error al obtener tiempo restante", error);
          dialog.showErrorBox(
            "Error",
            "No se puede recuperar la sesion activa previamente guardada."
          );
          // mejorar esto despues
          store.clear();
        }
      }

      if (retrieveSession === 1) {
        store.delete("username");
        store.delete("uuid");
      }
    }
    mainWindow.webContents.send("show_loading", false);
  }

  async function handleUpdateCounter() {
    mainWindow.webContents.send("show_loading", true);
    const username = (await store.get("username")) as string;
    const uuid = (await store.get("uuid")) as string;

    if (!!username && !!uuid) {
      const sessionHandler = new Session({
        username,
        uuid,
      });

      const time = await sessionHandler.getRemainingTime();
      console.log("Obteniendo tiempo restante", time);
      mainWindow.webContents.send("show_loading", false);
      mainWindow.webContents.send("show_counter", time);
    } else {
      mainWindow.webContents.send("show_loading", false);
      dialog.showErrorBox(
        "Error",
        "No se ha podido recuperar la sesion. Ingrese nuevamente."
      );
      mainWindow.webContents.send("show_login");
    }
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // app.quit();
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
