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

import { load } from "cheerio";
import "../css/index.css";
import { IpcRendererEvent } from "electron";

export interface IElectronAPI {
  sessionLogout: () => Promise<void>;
  updateCounter: () => Promise<void>;
  showLoginForm: (
    callback: (event: IpcRendererEvent, value: any) => void
  ) => void;
  dogbark(arg0: string, arg1: string): unknown;
  handleLogin: (user: string, password: string) => Promise<void>;
  handleCounter: (
    callback: (event: IpcRendererEvent, value: any) => void
  ) => void;
  initCountDown: (
    callback: (event: IpcRendererEvent, availableTime: Date) => void
  ) => void;
  showLoading: (
    callback: (event: IpcRendererEvent, value: boolean) => void
  ) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

const loginButton = document.getElementById("btn");
const userInput = document.getElementById("email") as HTMLInputElement;
const passwordInput = document.getElementById("password") as HTMLInputElement;
loginButton.addEventListener("click", async () => {
  const user = userInput.value;
  const password = passwordInput.value;
  window.electronAPI.handleLogin(user, password);
});
const form = document.getElementById("form") as HTMLFormElement;
form.addEventListener("submit", (event) => {
  event.preventDefault();
});

const logOutBtn = document.getElementById("logout-btn");
const updateBtn = document.getElementById("update-counter-btn");

updateBtn.addEventListener("click", () => {
  window.electronAPI.updateCounter();
});

logOutBtn.addEventListener("click", () => {
  window.electronAPI.sessionLogout();
});

function showLoginForm() {
  // const h1 = document.getElementById('num');
  const div = document.getElementById("counter");
  div.style.display = "none";
  form.style.display = "block";
}

let intervalId: number | undefined;
let originalTime: number;

// Constantes globales para las unidades de tiempo
const second = 1000;
const minute = second * 60;
const hour = minute * 60;

const initCounter = (leftHours = 0, leftMinutes = 0, leftSeconds = 0) => {
  // Calculate the total countdown time in milliseconds
  originalTime = leftHours * hour + leftMinutes * minute + leftSeconds * second;

  const countDown = new Date().getTime() + originalTime;

  // Cache DOM elements to avoid repeated DOM queries
  const hoursElement = document.getElementById("data-hours") as HTMLSpanElement;
  const minutesElement = document.getElementById(
    "data-minutes"
  ) as HTMLSpanElement;
  const secondsElement = document.getElementById(
    "data-seconds"
  ) as HTMLSpanElement;

  if (intervalId !== undefined) {
    clearInterval(intervalId);
  }

  intervalId = window.setInterval(() => {
    const now = new Date().getTime();
    const distance = countDown - now;

    // Update DOM elements if they exist
    if (hoursElement) {
      hoursElement.innerText = String(Math.floor(distance / hour));
    }

    if (minutesElement) {
      minutesElement.innerText = String(Math.floor((distance % hour) / minute));
    }

    if (secondsElement) {
      secondsElement.innerText = String(
        Math.floor((distance % minute) / second)
      );
    }

    // Clear interval if countdown is over
    if (distance < 0) {
      clearInterval(intervalId);

      // Optionally, set all elements to zero when the countdown is over
      if (hoursElement) hoursElement.innerText = "0";
      if (minutesElement) minutesElement.innerText = "0";
      if (secondsElement) secondsElement.innerText = "0";
    }
  }, second);
};

const resetCounter = () => {
  // Clear the interval if it exists
  if (intervalId !== undefined) {
    clearInterval(intervalId);
  }

  // Reinitialize the counter with the original time
  const countDown = new Date().getTime() + originalTime;

  // Cache DOM elements to avoid repeated DOM queries
  const hoursElement = document.getElementById("data-hours") as HTMLSpanElement;
  const minutesElement = document.getElementById(
    "data-minutes"
  ) as HTMLSpanElement;
  const secondsElement = document.getElementById(
    "data-seconds"
  ) as HTMLSpanElement;

  intervalId = window.setInterval(() => {
    const now = new Date().getTime();
    const distance = countDown - now;

    // Update DOM elements if they exist
    if (hoursElement) {
      hoursElement.innerText = String(Math.floor(distance / hour));
    }

    if (minutesElement) {
      minutesElement.innerText = String(Math.floor((distance % hour) / minute));
    }

    if (secondsElement) {
      secondsElement.innerText = String(
        Math.floor((distance % minute) / second)
      );
    }

    // Clear interval if countdown is over
    if (distance < 0) {
      clearInterval(intervalId);

      // Optionally, set all elements to zero when the countdown is over
      if (hoursElement) hoursElement.innerText = "0";
      if (minutesElement) minutesElement.innerText = "0";
      if (secondsElement) secondsElement.innerText = "0";
    }
  }, 1000);
};

window.electronAPI.handleCounter((_event, value) => {
  const div = document.getElementById("counter");
  // const h1 = document.getElementById('num');
  div.style.display = "block";
  form.style.display = "none";
  const { hours, minutes, seconds } = value;
  initCounter(hours, minutes, seconds);
});

window.electronAPI.showLoading((_event, value) => {
  const app = document.getElementById("app_container");
  const loader = document.getElementById("loader");
  if (value) {
    app.style.display = "none";
    loader.style.display = "block";
  } else {
    app.style.display = "block";
    loader.style.display = "none";
  }
});

window.electronAPI.showLoginForm(() => {
  resetCounter();
  clearInterval(intervalId);
  showLoginForm();
});
