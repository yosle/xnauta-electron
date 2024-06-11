import got from "got";

export default class GeoLocationProvider {
  static async getLocationData() {
    try {
      const response = await got("https://api.my-ip.io/v2/ip.json").json();
      return response;
    } catch (error) {
      console.log("Unable to retrieve location data");
      return false;
    }
  }
}
