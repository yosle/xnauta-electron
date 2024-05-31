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

export interface IElectronAPI {
  sessionLogout: () => Promise<void>;
  updateCounter: () => Promise<void>;
  showLoginForm: (callback: (event: any, value: any) => void) => void;
  dogbark(arg0: string, arg1: string): unknown;
  handleLogin: (user: string, password: string) => Promise<void>;
  handleCounter: (callback: (event: any, value: any) => void) => void;
  initCountDown: (callback: (event: any, availableTime: Date) => void) => void;
  showLoading: (callback: (event: any, value: boolean) => void) => void;
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

let intervalId: NodeJS.Timeout | null = null;

const initCounter = (
  leftHours = 0,
  leftMinutes = 0,
  leftSeconds = 0,
  isInternational = true
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

  // Calculate the total countdown time in milliseconds
  const countDown =
    new Date().getTime() +
    leftHours * hour +
    leftMinutes * minute +
    leftSeconds * second;

  // Cache DOM elements to avoid repeated DOM queries

  const hoursElement = document.getElementById("data-hours") as HTMLSpanElement;
  const minutesElement = document.getElementById(
    "data-minutes"
  ) as HTMLSpanElement;
  const secondsElement = document.getElementById(
    "data-seconds"
  ) as HTMLSpanElement;

  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = setInterval(() => {
    const now = new Date().getTime();
    const distance = countDown - now;

    // Update DOM elements if they exist
    if (hoursElement) {
      hoursElement.innerText = String(Math.floor((distance % day) / hour));
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
  if (intervalId) {
    clearInterval(intervalId);
  }
  // Cache DOM elements to avoid repeated DOM queries
  const daysElement = document.getElementById("data-days") as HTMLSpanElement;
  const hoursElement = document.getElementById("data-hours") as HTMLSpanElement;
  const minutesElement = document.getElementById(
    "data-minutes"
  ) as HTMLSpanElement;
  const secondsElement = document.getElementById(
    "data-seconds"
  ) as HTMLSpanElement;

  // Reset all elements to zero
  if (daysElement) daysElement.innerText = "0";
  if (hoursElement) hoursElement.innerText = "0";
  if (minutesElement) minutesElement.innerText = "0";
  if (secondsElement) secondsElement.innerText = "0";
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
  console.log("SHOW LOADING EVENT ", value);
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
  showLoginForm();
});

// window.electronAPI.initCountDown((event, availableTime: Date) => {
//   console.log("dfsdfsdf", event, availableTime);

// });
