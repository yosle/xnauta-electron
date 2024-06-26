import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";

const config: ForgeConfig = {
  packagerConfig: {
    appVersion: "0.0.4",
    icon: "./src/assets/xnauta",
    name: "xnauta",
    extraResource: ["./src/assets/xnauta.png", "./src/assets/xnauta.ico"],
  },

  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      authors: "Yosleivy Baez",
      description: "Connect and manage ETECSA services",
      name: "xnauta",
    }),
    new MakerZIP({}, ["darwin"]),
    // new MakerRpm({}),
    new MakerDeb({
      options: {
        icon: "./src/assets/xnauta.png",
        maintainer: "Yosleivy Baez",
        homepage: "https://www.xnauta.com",
        productName: "xnauta",
        description: "Connect and manage ETECSA services",
        desktopTemplate: "./src/assets/xnauta.desktop",
      },
    }),
  ],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      devContentSecurityPolicy:
        "connect-src 'self' 'unsafe-eval' 'unsafe-inline' *",
      renderer: {
        config: rendererConfig,

        entryPoints: [
          {
            html: "./src/pages/index.html",
            js: "./src/renderer/renderer.ts",
            name: "main_window",
            preload: {
              js: "./src/preload/preload.ts",
            },
          },
        ],
      },
    }),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "yosle",
          name: "xnauta-electron",
        },
        prerelease: true,
      },
    },
  ],
};

export default config;
