import * as cheerio from 'cheerio';
import Store from 'electron-store'
import got from 'got';
import { CookieJar } from 'tough-cookie';

export default class Nauta {
    store: Store<Record<string, unknown>>
    readonly HOUR_RATE = 12.5;
    readonly NACIONAL_HOUR_RATE = 2.5;

    constructor() {
        const store = new Store({
            encryptionKey: 'nodejs/electron/XNauta'
        });
        this.store = store;
        // store.set('text', 'hello');
        console.log(store.get('text'))
    }

    public extractUserInfo = (body: string) => {
        const $ = cheerio.load(body);

        const statusText = $('#sessioninfo tr:nth-child(1) td:nth-child(2)').text().trim();
        const creditsText = $('#sessioninfo tr:nth-child(2) td:nth-child(2)').text().trim();
        const expirationDateText = $('#sessioninfo tr:nth-child(3) td:nth-child(2)').text().trim();
        const accessInfoText = $('#sessioninfo tr:nth-child(4) td:nth-child(2)').text().trim();

        return {
            status: statusText === 'Activa' ? 'Active' : 'Disabled',
            credits: parseFloat(creditsText.replace(' CUP', '')),
            expirationDate: expirationDateText === 'No especificada' ? 'None' : expirationDateText,
            accessInfo: accessInfoText === 'Acceso desde todas las áreas de Internet' ? 'All' : accessInfoText
        };
    }

    public calculateRemainingTime = (credits: number) => {
        const time = (credits / this.HOUR_RATE).toFixed(2);
        const parts = time.toString().split('.');
        const hours = parseInt(parts[0]);

        let minutes = parseInt(parts[1]);
        let seconds = 0;

        if (minutes > 60) {
            seconds = minutes - 60;
            minutes = 60;
        }

        return { hours, minutes, seconds: 0 };
    }

    public getLoginParams(body: string) {
        console.log("obteniendo login params")
        const $ = cheerio.load(body);
        return (
            $('#formulario')
                .find('input[type="hidden"]')
                .map((_i: number, el: cheerio.Element) => {
                    return {
                        [$(el).attr('name') as string]: $(el).attr('value') as string,
                    };
                })
                .get()
        );
    }



    public extractUUID = (body: string) => {
        const match = /ATTRIBUTE_UUID=(\w*)&/.exec(body);
        return match ? match[1] : null;
    }

    public async login() {

        const cookieJar = new CookieJar();

        let response = await got.get('https://secure.etecsa.net:8443', { cookieJar });
        console.log("response", response.body);
        const loginParameters = this.getLoginParams(response.body);
        console.log("login params ", loginParameters)
        response = await got.post('https://secure.etecsa.net:8443/LoginServlet', {
            cookieJar,
            form: {
                ...loginParameters,
                username: 'yosleivy.baez@nauta.co.cu',
                password: 'Mudvayne1990*',
            }
        });
        console.log("response post", response.body);

        const sessionData = {
            username: 'yosleivy.baez@nauta.co.cu',
            uuid: this.extractUUID(response.body)
        };
        this.store.set(sessionData);
        console.log("storedata", this.store.get('username'));
        return this.store;
    }

    public async userInfo(credentials: { username: string, password: string }) {
        const cookieJar = new CookieJar();

        let response = await got.get('https://secure.etecsa.net:8443', { cookieJar });

        const loginParameters = this.getLoginParams(response.body);

        response = await got.post('https://secure.etecsa.net:8443/EtecsaQueryServlet', {
            cookieJar,
            form: {
                ...loginParameters,
                username: credentials.username,
                password: credentials.password,
            }
        });

        const userInfo = this.extractUserInfo(response.body);

        return {
            ...userInfo,
            remainingTime: this.calculateRemainingTime(userInfo.credits)
        }
    }

}