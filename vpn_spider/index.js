import { $, cd, argv, fs } from "zx";
import clipboardy from "clipboardy";
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { getVpns } from "./utils.js";

const intl = new Intl.DateTimeFormat("zh", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const latestFilePath = resolve(__dirname, "./.latest");

cd(resolve(__dirname, ".."));

if (argv.push) await $`git pull`;

const latest = (() => {
  if (!fs.existsSync(latestFilePath)) {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    fs.writeFileSync(latestFilePath, date.toISOString(), "utf8");

    return date;
  }

  const date = fs.readFileSync(latestFilePath, "utf8").trim();
  return date ? new Date(date) : new Date();
})();

// https://www.iyio.net/search/label/%E5%85%8D%E8%B4%B9%E8%8A%82%E7%82%B9?max-results=50
// const link = "https://www.mattkaydiary.com/search/label/vpn?max-results=50";
const links = [
  "https://www.iyio.net/search/label/%E5%85%8D%E8%B4%B9%E8%8A%82%E7%82%B9?max-results=50",
  "https://www.mattkaydiary.com/search/label/vpn?max-results=50",
];

const browser = await chromium.launch({
  proxy: {
    server: "socks5://127.0.0.1:10808",
  },
});
const context = await browser.newContext();
const page = await context.newPage();

const posts = [];
for await (const link of links) {
  console.log(`正在访问: ${link}`);

  await page.goto(link, { timeout: 600000 });
  let plist = [];
  if (link.includes("www.iyio.net")) {
    plist = await page.evaluate(() => {
      const $main = document.querySelector(".blogCont");
      const $posts = $main.querySelectorAll(".blogPts article.ntry");
      return Array.from($posts).map((post) => {
        const $link = post.querySelector("h2.pTtl a");
        const $date = post.querySelector("time.pTtmp");
        return {
          title: $link.textContent.trim(),
          href: $link.href,
          date: new Date($date.dateTime),
        };
      });
    });
  } else if (link.includes("www.mattkaydiary.com")) {
    plist = await page.evaluate(() => {
      const $main = document.querySelector("#main");
      const $posts = $main.querySelectorAll(".blog-posts .post");
      return Array.from($posts).map((post) => {
        const $link = post.querySelector(".post-title a");
        const $date = post.querySelector(".published.timeago");
        return {
          title: $link.textContent.trim(),
          href: $link.href,
          date: new Date($date.title),
        };
      });
    });
  }
  plist = plist.filter((post) => {
    return post.date > latest;
  });
  posts.push(...plist);
}

let vpns = getVpns();
console.log(`vpns :>> `, vpns);

for await (const post of posts) {
  // console.log(`[${intl.format(post.date)}]${post.title}`);
  console.log(
    `[${post.date.toLocaleDateString()}][${new URL(post.href).hostname}]${
      post.title
    }`
  );
  try {
    await page.goto(post.href, { timeout: 300000 });
    const vpn = await page.evaluate(() => {
      const content = document.querySelector("body").innerHTML;
      return content.match(/(ss|trojan|vmess):[^<]+/g) || [];
    });

    vpns.push(...vpn);

  } catch (e) {
    console.error(`${post.href} load error:`, e);
  }
}

vpns = [...new Set(vpns)];

if (vpns.length) {
  const txt = vpns.join("\n");
  clipboardy.writeSync(txt);
  fs.writeFileSync(resolve(__dirname, "./vpns.txt"), txt, "utf8");

  // 生成订阅链接
  fs.writeFileSync(
    resolve(__dirname, "./rss.txt"),
    Buffer.from(txt, "utf8").toString("base64"),
    "utf8"
  );
}

if (posts.length) {
  fs.writeFileSync(latestFilePath, posts[0]?.date.toISOString(), "utf8");
}

console.log(`已抓取到 ${vpns.length} 个节点, 已复制到剪切板`);

await browser.close();

if (argv.push) {
  await $`git add .`;
  const { stdout } = await $`git diff --name-only --cached`;
  const files = stdout.trim().split("\n").filter(Boolean);

  if (files.length) {
    await $`git commit -m ${`update ${files.join()}`}`;
    await $`git push`;
  }
}

process.on("uncaughtException", () => {
  browser?.close?.();
  process.exit();
});

process.exit();
