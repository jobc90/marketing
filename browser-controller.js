const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const crypto = require("crypto");
const { spawn } = require("child_process");

let browserMap = new Map();
const EXTRA = 1;
const service = 1;
const batchSize = 4;

puppeteer.use(StealthPlugin());

const initBrowsers = async () => {
  await createBrowsers();
  await setBrowsers();
  console.log("init finish");
};

const createBrowsers = async () => {
  console.log("create browser...");
  const promises = Array(EXTRA * service)
    .fill()
    .map(async (_, i) => {
      // const xvfb = spawn("Xvfb", [":99", "-screen", "0", "1024x768x24", "-ac"]);
      // process.env.DISPLAY = ":99";
      let hashCode = crypto.randomBytes(20).toString("hex");
      const browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
        protocolTimeout: 30000,
        executablePath: "/opt/homebrew/bin/chromium",
        // executablePath: "/snap/bin/chromium",
      });
      browserMap.set(hashCode, browser);
    });

  await Promise.all(promises);

  console.log("finish create browser...");
};

const createBrowser = async (startCode) => {
  //브라우저 생성
  let hashCode = crypto.randomBytes(20).toString("hex");
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: process.env.HEADLESS === "true" ? true : false,
  });
  browserMap.set(hashCode, browser);

  //브라우저 페이지 세팅
  switch (Number(startCode)) {
    case 100:
      await businessPreparation(hashCode);
      break;
    case 200:
      await mailPreparation(hashCode);
      break;
    case 300:
      await coupangPreparation(hashCode);
      break;
    case 400:
      break;
    case 500:
      break;
    default:
      break;
  }
};

const setBrowsers = async () => {
  const taskEntries = [...browserMap.entries()];
  var count = 0;

  for (let i = 0; i < taskEntries.length; i += batchSize) {
    const batch = taskEntries.slice(i, i + batchSize);
    const batchPromises = [];

    for (const [key, value] of batch) {
      switch ((parseInt(count / EXTRA) + 1) * 100) {
        case 100:
          batchPromises.push(businessPreparation(key));
          break;
        case 200:
          batchPromises.push(mailPreparation(key));
          break;
        case 300:
          batchPromises.push(coupangPreparation(key));
          break;
        case 400:
          break;
        case 500:
          break;
        default:
          break;
      }
      count++;
    }

    await Promise.all(batchPromises);
    console.log(batchSize + " batch 종료");
  }
};

const getBrowser = async (userKey) => {
  const browser = browserMap.get(userKey);
  if (browser) {
    return browser;
  } else {
    console.log("Error 잘못된 hashCode");
    return null;
  }
};

const businessPreparation = async (hashCode) => {
  const browser = await getBrowser(hashCode);
  if (browser == null) {
    console.log({ error: "user hashCode error" });
    return;
  }
  const homtaxPages = await browser.pages();
  const homtaxPage = homtaxPages[0];
  // 홈택스 이동후 간편인증 클릭
  try {
    try {
      await homtaxPage.goto(
        "https://www.hometax.go.kr/websquare/websquare.wq?w2xPath=/ui/pp/index_pp.xml&tmIdx=0&tm2lIdx=100907&tm3lIdx=",
        {
          waitUntil: "networkidle2",
        }
      );

      await homtaxPage.waitForTimeout(1000);
      await homtaxPage.keyboard.press("Enter");
      await homtaxPage.waitForTimeout(1000);
      await homtaxPage.keyboard.press("Enter");
      const veraport = await homtaxPage.waitForSelector("#textbox1");
      await veraport.click();
      await homtaxPage.waitForTimeout(15000);
      console.log("보안프로그램");
      const frame = await homtaxPage
        .frames()
        .find((frame) => frame.name() === "txppIframe");

      const safeText = await frame.$eval(
        "#object_status_E-SAFER-NX",
        (element) => element.textContent
      );
      console.log("Element text:", safeText);
      const safe = await frame.waitForSelector("#download_E-SAFER-NX");
      await safe.click();
      await homtaxPage.waitForTimeout(1000);
      const ipinsideText = await frame.$eval(
        "#object_status_IPINSIDE-NX",
        (element) => element.textContent
      );
      console.log("Element text:", ipinsideText);
      const ipinside = await frame.waitForSelector("#download_IPINSIDE-NX");
      await ipinside.click();
      //   await frame.evaluate(() => {
      //     document.querySelector('#download_IPINSIDE-NX').click();
      // });
      await homtaxPage.waitForTimeout(1000);
      const magicText = await frame.$eval(
        "#object_status_MAGIC-XML-NX",
        (element) => element.textContent
      );
      console.log("Element text:", magicText);
      const [magic] = await frame.$x(
        "//a[@id='download_MAGIC-PKI-NX' and contains(@title, '전자서명 프로그램 파일다운로드')]"
      );
      await magic.click();
      await homtaxPage.waitForTimeout(1000);
      const uploadText = await frame.$eval(
        "#object_status_KUPLOAD",
        (element) => element.textContent
      );
      console.log("Element text:", uploadText);
      const upload = await frame.waitForSelector("#download_KUPLOAD");
      await upload.click();
      await homtaxPage.waitForTimeout(1000);
      const agreeText = await frame.$eval(
        "#object_status_MAGIC-PKI-NX",
        (element) => element.textContent
      );
      console.log("Element text:", agreeText);
      const agree = await frame.waitForSelector("#download_MAGIC-PKI-NX");
      await agree.click();
    } catch (error) {
      console.error("홈페이지 이동 후 로그인 클릭에서 에러 발생함.", error);
      return;
    }
  } catch (error) {
    console.error("간편로그인 이동중 에러발생함.", error);
    return;
  }
};

const mailPreparation = async (hashCode) => {
  const browser = await getBrowser(hashCode);
  if (browser == null) {
    console.log({ error: "user hashCode error" });
    return;
  }
  const pages = await browser.pages();
  const page = pages[0];

  try {
    await page.goto("https://www.gov.kr/nlogin/?Mcode=10003", {});
  } catch (error) {
    console.error(error);
    return;
  }
};

const coupangPreparation = async (hashCode) => {
  const browser = await getBrowser(hashCode);
  if (browser == null) {
    console.log({ error: "user hashCode error" });
    return;
  }
  const coupangPages = await browser.pages();
  const coupangPage = coupangPages[0];
  // 쿠팡윙 이동후 대기
  try {
    await coupangPage.goto(
      "https://wing.coupang.com/tenants/vendor-signup/signup",
      {
        waitUntil: "networkidle2",
      }
    );
  } catch (error) {
    console.error("쿠팡 가입페이지 이동중 에러 발생함.", error);
    return;
  }
};

exports.browserMap = browserMap;
exports.initBrowsers = initBrowsers;
exports.getBrowser = getBrowser;
exports.createBrowser = createBrowser;
