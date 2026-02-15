import { config as configBase } from "@tamagui/config/v3";
import { createTamagui } from "tamagui";

const appConfig = createTamagui(configBase);

export type Conf = typeof appConfig;
declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}
export default appConfig;
