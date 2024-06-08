import * as cheerio from "cheerio";
import Store from "electron-store";
import got from "got";
import { CookieJar } from "tough-cookie";

export default class Nauta {
  store: Store<Record<string, unknown>>;
  cookieJar: CookieJar;
  readonly HOUR_RATE = 12.5;
  readonly NACIONAL_HOUR_RATE = 2.5;
  readonly MAX_TIMEOUT_MILISECONDS = 30000;

  constructor(storeInstance: Store, cookieJar: CookieJar) {
    // const store = new Store({
    //   encryptionKey: "nodejs/electron/XNauta",
    // });
    this.store = storeInstance;
    this.cookieJar = cookieJar;
  }

  public extractUserInfo = (body: string) => {
    const $ = cheerio.load(body);

    const statusText = $("#sessioninfo tr:nth-child(1) td:nth-child(2)")
      .text()
      .trim();
    const creditsText = $("#sessioninfo tr:nth-child(2) td:nth-child(2)")
      .text()
      .trim();
    const expirationDateText = $("#sessioninfo tr:nth-child(3) td:nth-child(2)")
      .text()
      .trim();
    const accessInfoText = $("#sessioninfo tr:nth-child(4) td:nth-child(2)")
      .text()
      .trim();

    return {
      status: statusText === "Activa" ? "Active" : "Disabled",
      credits: parseFloat(creditsText.replace(" CUP", "")),
      expirationDate:
        expirationDateText === "No especificada" ? "None" : expirationDateText,
      accessInfo:
        accessInfoText === "Acceso desde todas las áreas de Internet"
          ? "All"
          : accessInfoText,
    };
  };

  public calculateRemainingTime = (credits: number, rate: number) => {
    const time = (credits / rate).toFixed(2);
    const parts = time.toString().split(".");
    const hours = parseInt(parts[0]);

    let minutes = parseInt(parts[1]);
    let seconds = 0;

    if (minutes > 60) {
      seconds = minutes - 60;
      minutes = 60;
    }

    return { hours, minutes, seconds: 0 };
  };

  public getLoginParams(body: string) {
    console.log("obteniendo login params");
    const $ = cheerio.load(body);
    return $("#formulario")
      .find('input[type="hidden"]')
      .map((_i: number, el: cheerio.Element) => {
        return {
          [$(el).attr("name") as string]: $(el).attr("value") as string,
        };
      })
      .get();
  }

  public extractUUID = (body: string) => {
    const match = /ATTRIBUTE_UUID=(\w*)&/.exec(body);
    return match ? match[1] : null;
  };

  /**
   * Login will take Store and CookieJar instance
   * @returns
   */
  public async login(username: string, password: string) {
    console.log(`INIT LOGIN with credentials ${username}:${password}`);
    const cookieJar = this.cookieJar;

    try {
      let response = await got.get("https://secure.etecsa.net:8443", {
        cookieJar,
      });
      console.log("RESPONSE STATUS: ", response?.statusCode);
      const loginParameters = this.getLoginParams(response.body);
      console.log("LOGIN PARAMS: ", loginParameters);
      response = await got.post("https://secure.etecsa.net:8443/LoginServlet", {
        cookieJar,
        timeout: this.MAX_TIMEOUT_MILISECONDS,
        form: {
          ...loginParameters,
          username: username,
          password: password,
        },
      });
      if (!response || response instanceof Error)
        return new Error(`No se ha podido conectar`);

      const sessionData = {
        username: username,
        uuid: this.extractUUID(response.body),
      };

      if (!sessionData.username || !sessionData.uuid) {
        return new Error(`No se ha podido conectar`);
      }
      //save session in store
      this.store.set(sessionData);
      return sessionData;
    } catch (error) {
      console.error("Error al hacer login", error);
      return error;
    }
  }

  public async userInfo(credentials: { username: string; password: string }) {
    const cookieJar = this.cookieJar;

    let response = await got.get("https://secure.etecsa.net:8443", {
      cookieJar,
      timeout: this.MAX_TIMEOUT_MILISECONDS,
    });

    const loginParameters = this.getLoginParams(response.body);

    response = await got.post(
      "https://secure.etecsa.net:8443/EtecsaQueryServlet",
      {
        cookieJar,
        form: {
          ...loginParameters,
          username: credentials.username,
          password: credentials.password,
        },
        timeout: this.MAX_TIMEOUT_MILISECONDS,
      }
    );
    let rate = this.HOUR_RATE;
    if (credentials.username.includes("@nauta.co.cu")) {
      rate = this.NACIONAL_HOUR_RATE;
    }
    const userInfo = this.extractUserInfo(response.body);

    return {
      ...userInfo,
      remainingTime: this.calculateRemainingTime(userInfo.credits, rate),
    };
  }
}
