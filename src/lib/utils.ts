import got from "got";

export async function checkNacConnection() {
  try {
    const response = await got("https://www.cubadebate.cu");
    if (response.statusCode !== 200) {
      return false;
    }
    return true;
  } catch (error) {
    console.log("No hay conexion nacional");
    return false;
  }
}
