import {Browser, Page} from "puppeteer";
import puppeteer from "puppeteer-extra";
import puppeteerStealth from "puppeteer-extra-plugin-stealth";
import randomUseragent from "random-useragent";
import {logger} from "firebase-functions";
import moment from "moment";

export interface UrlResult {
  content:string,
  status:number,
}

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';
let cachedBrowser:Browser|null = null

const getBrowser = async ():Promise<Browser> => {
  if (cachedBrowser) {
    return cachedBrowser
  }
  puppeteer.use(puppeteerStealth())
  const start = moment()
  logger.info('Launching headless browser')
  // @ts-ignore
  cachedBrowser = await puppeteer.launch({
    headless: true,
    args: [
      // '--disable-setuid-sandbox',
      // '--no-sandbox',

      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-sandbox',
      '--no-zygote',
      '--single-process',
      "--proxy-server='direct://'",
      '--proxy-bypass-list=*',
      '--deterministic-fetch',
    ],
  })
  const end = moment()
  logger.info(`Launched headless browser in ${end.diff(start, 'milliseconds')}ms`)
  // @ts-ignore
  return cachedBrowser
}

const getPage = async ():Promise<Page> => {
  const browser = await getBrowser()
  const start = moment()
  logger.info('Launching headless browser page')
  // https://stackoverflow.com/questions/55678095/bypassing-captchas-with-headless-chrome-using-puppeteer
  const page = await browser.newPage()
  // logger.info(`Started new page`)
  await page.setViewport({
    width: 1920 + Math.floor(Math.random() * 100),
    height: 3000 + Math.floor(Math.random() * 100),
    deviceScaleFactor: 1,
    hasTouch: false,
    isLandscape: false,
    isMobile: false,
  });
  // logger.info(`Set Viewport`)
  const userAgent = randomUseragent.getRandom() || DEFAULT_USER_AGENT;
  await page.setUserAgent(userAgent);
  await page.setJavaScriptEnabled(true);
  await page.setDefaultNavigationTimeout(0);
  await page.setRequestInterception(true);
  // logger.info(`Set Page options`)
  page.on('request', async (request) => {
    if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
      await request.abort();
    } else {
      await request.continue();
    }
  });
  await page.evaluateOnNewDocument(() => {
    //pass webdriver check
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });
  // logger.info(`Web driver check`)
  await page.evaluateOnNewDocument(() => {
    //pass chrome check
    // @ts-ignore
    window.chrome = {
      runtime: {},
      // etc.
    };
  });
  // logger.info(`Chrome check`)
  await page.evaluateOnNewDocument(() => {
    //pass plugins check
    const originalQuery = window.navigator.permissions.query;
    // @ts-ignore
    return window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
    );
  });
  // logger.info(`Plugins check`)
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `plugins` property to use a custom getter.
    Object.defineProperty(navigator, 'plugins', {
      // This just needs to have `length > 0` for the current test,
      // but we could mock the plugins too if necessary.
      get: () => [1, 2, 3, 4, 5],
    });
  });
  // logger.info(`plugins override`)
  await page.evaluateOnNewDocument(() => {
    // Overwrite the `languages` property to use a custom getter.
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    });
  });
  // logger.info(`languages override`)
  const end = moment()
  logger.info(`Launched headless browser page in ${end.diff(start, 'milliseconds')}ms`)
  return page
}

const loadUrl = async (url:string):Promise<UrlResult> => {
  const page = await getPage()
  logger.info(`Navigating headless browser to ${url}`)
  const response = await page.goto(url)
  await page.waitForFunction('document.querySelector("body")')
  const result = {
    content: await response.text(),
    status: response.status(),
  }
  logger.info(`Navigated headless browser to ${url} - ${result.status}`)
  await page.close()
  return result
}

export const headlessBrowser = {
  loadUrl,
}