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

import { updateElectronApp } from "update-electron-app";
import GeoLocationProvider from "./lib/geolocation";
// import * as Sentry from "@sentry/electron";

// crashReporter.start({ submitURL: "https://t.me/UtilesSaldo" });

// Sentry.init({
//   dsn: "https://e47cb8e6e38ba8c74300512c07110275@o4507388328083456.ingest.de.sentry.io/4507409442013264",
// });

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
const APP_VERSION_NUMBER = "0.0.1";
const NOTIFICATION_TITLE = "XNauta";
const args = minimist(process.argv.slice(1));
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

if (args.version || args.v) {
  console.log(`${NOTIFICATION_TITLE} ${APP_VERSION_NUMBER}`);
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
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
  mainWindow = new BrowserWindow({
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

  // On close minimize to tray bar. The app must be closed always
  // from the tray bar context menu
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

  // minimize to tray bar
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

    // testing
    updateLocationData();
  });

  async function handleLogin(
    _event: IpcMainEvent,
    user: string,
    password: string
  ) {
    if (!net.isOnline) {
      dialog.showErrorBox("Error", "No se pudo establecer la conexión.");
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
      if (session instanceof Error) {
        dialog.showErrorBox("Error", session.message);
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
        dialog.showErrorBox(
          "Error",
          `No se ha podido obtener el tiempo restante. Por favor comprueba si ya estás conectado.`
        );
        return;
      }
      mainWindow.webContents.send("show_loading", false);
      console.log("TIEMPO RESTANTE: ", time);
      mainWindow.webContents.send("show_counter", time);
      // enable diconnect and update options
      contextMenuConnected.items[1].visible = true;
      contextMenuConnected.items[3].visible = true;
      tray.setContextMenu(contextMenuConnected);
      if (username.includes("@nauta.com.cu")) {
        // try to update when connected
        // refractor this later
        updateElectronApp({
          logger: console,
          updateInterval: "10 minutes",
        });
      }
    } catch (error) {
      isSessionActive = false;
      mainWindow.webContents.send("show_loading", false);
      dialog.showErrorBox(
        "Error",
        `Compruebe su conexión a Internet y que no esta detras de un proxy o VPN.`
      );
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
      const retrieveSession = dialog.showMessageBoxSync({
        type: "question",
        message:
          "Hay una sesión guardada en la aplicación de la última vez que se usó. " +
          "Desea intentar recuperarla? Toque 'No' o 'Cancelar' para iniciar con otra cuenta.",
        buttons: ["Si", "No"],
        title: "Recuperar sesión",
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

  async function updateLocationData() {
    const data = await GeoLocationProvider.getLocationData();
    if (data) {
      mainWindow.webContents.send("show_location_info", data);
    }
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
