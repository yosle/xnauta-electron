import got from "got";

interface SessionData {
  uuid: string;
  username: string;
}
const parseTime = (value: string) => {
  const match = /(\d+):([\d]{2}):([\d]{2})/.exec(value);

  return {
    hours: parseInt(match[1]),
    minutes: parseInt(match[2]),
    seconds: parseInt(match[3]),
  };
};

export default class Session {
  constructor(data: SessionData) {
    this.data = data;
  }

  private data;

  async getRemainingTime() {
    if (!this.data || !this.data?.uuid || !this.data.username) {
      return new Error(`Invalid session: ${JSON.stringify(this.data)}`);
    }
    const response = await got.post(
      "https://secure.etecsa.net:8443/EtecsaQueryServlet",
      {
        form: {
          op: "getLeftTime",
          ATTRIBUTE_UUID: this.data.uuid,
          username: this.data.username,
        },
      }
    );
    console.log("parse time response: ", response.body);
    return parseTime(response.body);
  }

  async logout() {
    try {
      const response = await got.post(
        "https://secure.etecsa.net:8443/LogoutServlet",
        {
          form: {
            ATTRIBUTE_UUID: this.data.uuid,
            // CSRFHW: this.data.csrfHw,
            username: this.data.username,
            remove: 1,
          },
        }
      );

      if (response.body === "logoutcallback('SUCCESS');") {
        return true;
      }

      throw new Error("Failure to logout: " + response.body);
    } catch (error) {
      console.log("Failure to logout: " + error);
      return false;
    }
  }
}
