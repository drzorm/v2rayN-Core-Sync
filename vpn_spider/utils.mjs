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
  return vmess.map((vms) => {
    let url = "";
    const {
      configVersion: v,
      address: add,
      port,
      id,
      alterId: aid,
      security: scy,
      network: net,
      remarks: ps,
      headerType: type,
      requestHost: host,
      path,
      streamSecurity: tls,
      sni,
      configType,
      // allowInsecure,
      // testResult,
      // subid,
      // flow,
    } = vms;
    const remarks = ps ? `#${encodeURIComponent(ps)}` : "";

    switch (configType) {
      case 1:
        // vmess
        url = JSON.stringify({ v, ps, add, port, id, aid, scy, net, type, host, path, tls, sni });
        url = Buffer.from(url, "utf8").toString("base64");
        url = `vmess://${url}`;
        break;
      case 3:
        // ss
        url = `${scy}:${id}@${add}:${port}`;
        url = Buffer.from(url, "utf8").toString("base64");
        url = `ss://${url}${remarks}`;
        break;
      case 6:
        // Trojan
        const query = sni ? `?sni={${encodeURI(sni)}}` : "";
        url = `${id}@${getIpv6(add)}:${port}`;
        url = `trojan://${url}${query}${remarks}`;
        break;

      default:
        break;
    }

    return url;
  }).filter(Boolean);
}
