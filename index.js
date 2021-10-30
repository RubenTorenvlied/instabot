const config = require("./config.json");
const fetch = require("node-fetch");
const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

let browser, page;
let messagingInitiated = false;
let targetData = fs.readFileSync("./targets.json", "utf8");
let targets = JSON.parse(targetData);

const message = `yoyo yoghurt`;
const messageTimeout = 10000;
const amountToSend = 25;

(async () => {
  try {
    if (config.username == "<USERNAME>" || config.password == "<PASSWORD>") {
      throw new Error("Please specify username and password");
    }
    await initialize();
    await doInstagramStuff();
  } catch (e) {
    console.log(e);
  }
})();

async function initialize() {
  console.log("Initiating Puppeteer");
  let executablePath =
    "C:\\Program Files\\Google\\Chrome\\Application\\Chrome.exe";
  if (process.platform === "darwin") {
    executablePath =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  browser = await puppeteer.launch({
    executablePath: executablePath,
    headless: false,
    args: ["--no-sandbox"],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 764 });
  console.log("Initiating succeeded");
}

async function doInstagramStuff() {
  console.log("Logging in...");
  await page.goto(config.base_url);
  await page.waitForSelector("button.aOOlW.bIiDR");
  await page.click("button.aOOlW.bIiDR");
  await page.waitForTimeout(1000);
  await page.waitForTimeout(2500);
  /* Click on the username field using the field selector*/
  await page.click(config.selectors.username_field);
  await page.keyboard.type(config.username);
  await page.click(config.selectors.password_field);
  await page.keyboard.type(config.password);
  await page.click(config.selectors.login_button);
  await page.waitForNavigation();
  await page.waitForTimeout(5000);

  const targetedFile = fs.readFileSync("./targeted.json", "utf8");
  const targetedAccounts = JSON.parse(targetedFile);
  let amountSended = 0;
  if (!targets) {
    throw new Error("No targets specified!");
  }
  for (let account of targets) {
    if (amountSended >= amountToSend) break;
    if (targetedFile.indexOf(account) !== -1) continue;
    await sendMessage(account, message);
    targetedAccounts.push(account);
    fs.writeFileSync("./targeted.json", JSON.stringify(targetedAccounts));
    amountSended++;
  }
  console.log("Done.");
  console.log("Terminating...");
  await browser.close();
}

async function sendMessage(username, msg) {
  !messagingInitiated &&
    (await page.goto("https://www.instagram.com/direct/inbox/"));
  !messagingInitiated && (await page.waitForTimeout(2000));
  //Close Turn On Notification modal after login
  (await page.$(config.selectors.not_now_button)) &&
    (await page.click(config.selectors.not_now_button));

  await page.waitForSelector(
    "#react-root > section > div > div.Igw0E.IwRSH.eGOV_._4EzTm > div > div > div.oNO81 > div.S-mcP > div > div._2NzhO.EQ1Mr > button"
  );
  await page.click(
    "#react-root > section > div > div.Igw0E.IwRSH.eGOV_._4EzTm > div > div > div.oNO81 > div.S-mcP > div > div._2NzhO.EQ1Mr > button"
  );
  await page.waitForSelector(
    "body > div.RnEpo.Yx5HN > div > div > div.Igw0E.IwRSH.eGOV_.vwCYk.i0EQd > div.TGYkm > div > div.HeuYH > input"
  );
  await page.type(
    "body > div.RnEpo.Yx5HN > div > div > div.Igw0E.IwRSH.eGOV_.vwCYk.i0EQd > div.TGYkm > div > div.HeuYH > input",
    username
  );
  await page.waitForTimeout(3000);
  await page.click(
    "body > div.RnEpo.Yx5HN > div > div > div.Igw0E.IwRSH.eGOV_.vwCYk.i0EQd > div.Igw0E.IwRSH.eGOV_.vwCYk._3wFWr > div:nth-child(1) > div"
  );
  await page.waitForTimeout(500);
  await page.click(
    "body > div.RnEpo.Yx5HN > div > div > div:nth-child(1) > div > div:nth-child(3) > div > button"
  );
  await page.waitForTimeout(3000);
  await page.type(config.selectors.messagebox, msg);
  await page.keyboard.press("Enter");
  messagingInitiated = true;
  await page.waitForTimeout(messageTimeout);
}

process.on("exit", async (code) => {
  console.log("Terminating...");
  if (browser) {
    await browser.close();
  }
});
