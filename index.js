const puppeteer = require('puppeteer-extra')
let browser, page;
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const config = require('./puppeteer.json');
const fetch = require('node-fetch');
const fs = require('fs');
puppeteer.use(StealthPlugin());
const instaObj = require('instagram-basic-data-scraper-with-username');
let exportAcc = 'TARGETACC';
let messagingInitiated = false;
let sentUsers = [];
let message = `msg`
const follow = "followers" // followers || following
async function start() {
    console.log("Initiating")
    browser = await puppeteer.launch({
        headless: config.settings.headless,
        args: ['--no-sandbox'],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1500, height: 764 });
    console.log("Initiating succeeded")
    await visitInstagram();
}
async function visitInstagram() {
    console.log("Logging in...")
    await page.goto(config.base_url);
    await page.waitForSelector('body > div.RnEpo.Yx5HN > div > div > div > div.mt3GC > button.aOOlW.bIiDR');
    await page.click('body > div.RnEpo.Yx5HN > div > div > div > div.mt3GC > button.aOOlW.bIiDR');
    await page.waitForTimeout(1000)
    await page.waitForTimeout(2500);
    /* Click on the username field using the field selector*/
    await page.click(config.selectors.username_field);
    await page.keyboard.type(config.username);
    await page.click(config.selectors.password_field);
    await page.keyboard.type(config.password);
    await page.click(config.selectors.login_button);
    await page.waitForNavigation();
    console.log("Logged in")

    const exportID = await fetchDataFromUser(exportAcc)
    console.log('ID',exportID)
    console.log("Fetching follower list of " + exportAcc)
    const res = await page.evaluate(async (exID) => {

        let followers = [], followings = []
        try {
            let userId = exID;
            let after = null, has_next = true
            while (has_next) {
                await fetch(`https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=` + encodeURIComponent(JSON.stringify({
                    id: userId,
                    include_reel: true,
                    fetch_mutual: true,
                    first: 50,
                    after: after
                }))).then(res => res.json()).then(res => {
                    has_next = res.data.user.edge_followed_by.page_info.has_next_page
                    after = res.data.user.edge_followed_by.page_info.end_cursor
                    followers = followers.concat(res.data.user.edge_followed_by.edges.map(({ node }) => {
                        return {
                            username: node.username,
                            full_name: node.full_name
                        }
                    }))
                })
            }

            has_next = true
            after = null
            while (has_next) {
                await fetch(`https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=` + encodeURIComponent(JSON.stringify({
                    id: userId,
                    include_reel: true,
                    fetch_mutual: true,
                    first: 50,
                    after: after
                }))).then(res => res.json()).then(res => {
                    console.log('res', res.data.user.edge_follow)
                    has_next = res.data.user.edge_follow.page_info.has_next_page
                    after = res.data.user.edge_follow.page_info.end_cursor
                    followings = followings.concat(res.data.user.edge_follow.edges.map(({ node }) => {
                        return {
                            username: node.username,
                            full_name: node.full_name
                        }
                    }))
                })
            }
            return { following: followings, followers: followers };
        } catch (err) {
            console.log('Invalid username')
        }
    },exportID)
    console.log("Fetch succeeded")

    console.log("Sending messages...")
    for(let i = 0; i<res.followers.length; i++) {
        await sendMessage(res.followers[i].username, message)
    }
    console.log("Done.")
    console.log("Terminating...")
    await browser.close();

}

async function sendMessage(username, msg) {
    !messagingInitiated && await page.goto('https://www.instagram.com/direct/inbox/');
    !messagingInitiated && await page.waitForTimeout(2000)
    //Close Turn On Notification modal after login
    await page.$(config.selectors.not_now_button) && await page.click(config.selectors.not_now_button);

    await page.waitForSelector('#react-root > section > div > div.Igw0E.IwRSH.eGOV_._4EzTm > div > div > div.oNO81 > div.S-mcP > div > div._2NzhO.EQ1Mr > button')
    await page.click('#react-root > section > div > div.Igw0E.IwRSH.eGOV_._4EzTm > div > div > div.oNO81 > div.S-mcP > div > div._2NzhO.EQ1Mr > button');
    await page.waitForSelector('body > div.RnEpo.Yx5HN > div > div > div.Igw0E.IwRSH.eGOV_.vwCYk.i0EQd > div.TGYkm > div > div.HeuYH > input')
    await page.type('body > div.RnEpo.Yx5HN > div > div > div.Igw0E.IwRSH.eGOV_.vwCYk.i0EQd > div.TGYkm > div > div.HeuYH > input', username);
    await page.waitForTimeout(3000)
    await page.click('body > div.RnEpo.Yx5HN > div > div > div.Igw0E.IwRSH.eGOV_.vwCYk.i0EQd > div.Igw0E.IwRSH.eGOV_.vwCYk._3wFWr > div:nth-child(1) > div')
    await page.waitForTimeout(500)
    await page.click('body > div.RnEpo.Yx5HN > div > div > div:nth-child(1) > div > div:nth-child(3) > div > button')
    await page.waitForTimeout(3000);
    await page.type(config.selectors.messagebox, msg);
    //await page.keyboard.press('Enter')
    sentUsers.push(username)
    messagingInitiated = true;
    await page.waitForTimeout(100000)

}
start();

async function fetchDataFromUser(uname) {
    const res = await instaObj.getId(uname);
    return res.data;
}

//fetchDataFromUser()

process.on('exit',async code=>{
    console.log('Terminating...');
    logToTextFile(true)
    await browser.close();
})

function logToTextFile(success) {
    let stream;
    let idx = 0;

    while (fs.existsSync(`./logs/log${idx}.txt`)) {
        idx++;
    }


    let data = `Logs: \n
    ${sentUsers.length} messages sent \n
    Users: ${JSON.stringify(sentUsers)} \n

    `

    fs.writeFileSync(`./logs/log${idx}.txt`,data,(err)=>{
        if(err){
            console.error(err)
        }
    })

}
