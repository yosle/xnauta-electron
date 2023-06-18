/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/latest/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import '../css/index.css';

export interface IElectronAPI {
    handleLogin: (user: string, password: string) => Promise<void>
  }
  
  declare global {
    interface Window {
      electronAPI: IElectronAPI
    }
  }

const setButton = document.getElementById('btn')
const userInput = document.getElementById('email') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
setButton.addEventListener('click', () => {
    const user = userInput.value;
    const password = passwordInput.value;
    window.electronAPI.handleLogin(user, password);
    console.log("Esto lo llamo desde el front", user , password)
});



console.log('👋 This message is being logged by "renderer.js", included via webpack');
