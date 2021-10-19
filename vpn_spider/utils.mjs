import { fs } from "zx";
import { isIPv6 } from "net";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const guiNConfigFilePath = resolve(__dirname, "../guiNConfig.json");

function getIpv6(ip) {
  return isIPv6(ip) ? `[${ip}]` : ip;
}

export function getVpns() {
  const guiNConfig = JSON.parse(fs.readFileSync(guiNConfigFilePath, "utf8"));
  const vmess = guiNConfig.vmess || [];

  return vmess;
}
