import { fs } from "zx";
import { isIPv6 } from "net";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const guiNConfigFilePath = resolve(__dirname, "../guiNConfig.json");

const ConfigType = {
  vmess: 1,
  custom: 2,
  shadowsocks: 3,
  socks: 4,
  vless: 5,
  trojan: 6,
};

const ProtocolType = {
  vmess: "vmess://",
  ss: "ss://",
  socks: "socks://",
  http: "http://",
  https: "https://",
  vless: "vless://",
  trojan: "trojan://",
};

export const Base64 = {
  encode: (txt) => {
    return Buffer.from(txt, "utf8").toString("base64");
  },
  decode: (txt) => {
    return Buffer.from(txt, "base64").toString("utf8");
  },
};

export function getIpv6(ip) {
  return isIPv6(ip) ? `[${ip}]` : ip;
}

export function getShareUrl({
  configVersion = 1,
  address = "",
  port = 0,
  id = "",
  alterId = 0,
  security = "",
  network = "",
  remarks = "",
  headerType = "",
  requestHost = "",
  path = "",
  streamSecurity = "",
  configType = ConfigType.vmess,
  sni = "",
}) {
  let url = "";
  const remark = remarks ? `#${encodeURIComponent(remarks)}` : "";

  switch (configType) {
    case ConfigType.vmess:
      const conf = {
        v: configVersion.toString(),
        ps: remarks.trim(), //备注也许很长 ;
        add: address,
        port: port.toString(),
        id: id,
        aid: alterId.toString(),
        scy: security,
        net: network,
        type: headerType,
        host: requestHost,
        path: path,
        tls: streamSecurity,
        sni: sni,
      };

      url = JSON.stringify(conf);
      url = `${ProtocolType.vmess}${Base64.encode(url)}`;
      break;
    case ConfigType.shadowsocks:
    case ConfigType.socks:
      url = `${security}:${id}@${address}:${port}`;
      url = `${ProtocolType.ss}${Base64.encode(url)}${remark}`;
      break;
    case ConfigType.trojan:
      const query = sni ? `?sni=${sni}` : "";

      url = `${id}@${getIpv6(address)}:${port}`;
      url = `${ProtocolType.socks}${Base64.encode(url)}${query}${remark}`;
      break;
    default:
      break;
  }

  return url;
}

export function getVpns() {
  const guiNConfig = JSON.parse(fs.readFileSync(guiNConfigFilePath, "utf8"));
  const vmess = guiNConfig.vmess || [];

  return vmess.map(getShareUrl);
}
