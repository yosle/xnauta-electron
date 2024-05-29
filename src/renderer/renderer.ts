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

import { IpcMainEvent } from "electron";
import "../css/index.css";

export interface IElectronAPI {
  sessionLogout: () => Promise<void>;
  dogbark(arg0: string, arg1: string): unknown;
  handleLogin: (user: string, password: string) => Promise<void>;
  handleCounter: (callback: (event: any, value: any) => void) => void;
  initCountDown: (callback: (event: any, availableTime: Date) => void) => void;
  showLoading: (callback: (event: any, value: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

const setButton = document.getElementById("btn");
const userInput = document.getElementById("email") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
setButton.addEventListener("click", async () => {
  const user = userInput.value;
  const password = passwordInput.value;
  window.electronAPI.handleLogin(user, password);
  console.log("Esto lo llamo desde el front", user, password);
});
const form = document.getElementById("form") as HTMLFormElement;
form.addEventListener("submit", (event) => {
  event.preventDefault();
});

const logOutBtn = document.getElementById("logout-btn");
const updateBtn = document.getElementById("update-counter-btn");

updateBtn.addEventListener("click", () => {
  console.log("actualizar");
});

logOutBtn.addEventListener("click", () => {
  const div = document.getElementById("counter");
  // const h1 = document.getElementById('num');
  div.style.display = "none";
  form.style.display = "block";
  window.electronAPI.sessionLogout();
});
const initCounter = (
  leftHours: number,
  leftMinutes: number,
  leftSeconds: number
) => {
  console.log(
    "Result recibido en el renderer initCounter",
    leftHours,
    leftMinutes,
    leftSeconds
  );

  const second = 1000,
    minute = second * 60,
    hour = minute * 60,
    day = hour * 24;
  const countDown = new Date().getTime() + leftMinutes * 60000;
  const intervalId = setInterval(() => {
    const now = new Date().getTime();
    const distance = countDown - now;

    if (document.getElementById("data-days") != null) {
      (document.getElementById("data-days") as HTMLSpanElement).innerText =
        String(Math.floor(distance / day));
    }

    if (document.getElementById("data-hours") != null) {
      document.getElementById("data-hours").innerText = String(
        Math.floor((distance % day) / hour)
      );
    }

    if (document.getElementById("data-minutes") != null) {
      (document.getElementById("data-minutes") as HTMLSpanElement).innerText =
        String(Math.floor((distance % hour) / minute));
    }

    if (document.getElementById("data-seconds") != null) {
      (document.getElementById("data-seconds") as HTMLSpanElement).innerText =
        String(Math.floor((distance % minute) / second));
    }

    if (distance < 0) {
      clearInterval(intervalId);
    }
  }, second);
};

window.electronAPI.handleCounter((event, value) => {
  const div = document.getElementById("counter");
  // const h1 = document.getElementById('num');
  div.style.display = "block";
  form.style.display = "none";
  const { hours, minutes, seconds } = value;
  initCounter(hours, minutes, seconds);
});

window.electronAPI.showLoading((event, value) => {
  console.log("Loading event", value);
});

// window.electronAPI.initCountDown((event, availableTime: Date) => {
//   console.log("dfsdfsdf", event, availableTime);

// });
