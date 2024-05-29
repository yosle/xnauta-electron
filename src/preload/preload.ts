// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import {
  ipcRenderer,
  contextBridge,
  IpcRendererEvent,
  IpcMainEvent,
} from "electron";

// contextBridge.exposeInMainWorld('electronAPI', {
//     setTitle: (title: string) => {
//     return ipcRenderer.send('set-title', title);
//   }
// });

contextBridge.exposeInMainWorld("electronAPI", {
  handleLogin: (user: string, password: string) => {
    return ipcRenderer.send("login", user, password);
  },
  handleCounter: (
    callback: (event: IpcRendererEvent | IpcMainEvent, value: string) => void
  ) => ipcRenderer.on("show_counter", callback),
  sessionLogout: () => {
    return ipcRenderer.send("session_logout");
  },
  showLoading: (
    callback: (event: IpcRendererEvent | IpcMainEvent, value: string) => void
  ) => ipcRenderer.on("show_loading", callback),
});

// contextBridge.exposeInMainWorld('electronAPI', {
// })
