const { chromium } = require("playwright");
const {THRIVE_EMAIL, THRIVE_PASSWORD} = require("./secret");

// extract url command line argument or exit process with error
const url = process.argv[2];
if (url === '--help'){
    console.log("URL must be a URL to a thrive search. Usage: node logPursuingOutreach.js <URL>");
    process.exit(0);
}
if (!url) {
  console.error('Error: URL argument is missing. Usage: node logPursuingOutreach.js <URL>');
  process.exit(1);
}

/** login to thrive on login page */
async function loginToThrive(page){
    await page.waitForSelector('#user_email');
    await page.waitForSelector('#user_password');
    await page.fill('#user_email', THRIVE_EMAIL);
    await page.fill('#user_password', THRIVE_PASSWORD);
    await page.click('input[type="submit"][value="Log in"]');
}

/** navigate to pursuing and return candidates */
async function extractPursuingCandidates(page){
    const pursuingElement = await page.waitForSelector('.CandidacyListItem[data-test-stage="Pursuing"]');
    const expandIcon = await pursuingElement.$('.CandidacyListItemStageGroupHeader__ExpandedIndicator .icon-expand');
    if (expandIcon) await expandIcon.click();
    const profiles = await page.$$('.CandidacyListItem.CandidacyListItem--candidate[data-test-stage="Pursuing"]');
    return profiles;
}

/** iterate through profiles, log outreach for each one and return # of profiles logged */
async function doOutreachActions(profiles, page){
    let count = 0;
    for (const profile of profiles){
        const nameElement = await profile.$(".ContactName");
        await nameElement.click();
        const outreachIcon = await page.waitForSelector('.icon.icon-nav-outreach');
        await outreachIcon.click();
        const addOutreachBtn = await page.waitForSelector('button.form-toggle-button.btn.btn-secondary:has-text("Add Outreach")');
        await addOutreachBtn.click();
        const submitBtn = await page.waitForSelector('.btn.SubmitButton.btn-primary.btn-sm');
        await submitBtn.click();
        count +=1;
    }
    return count;
}

/** 
 * main function that launches Playwright, navigates to designated URL, 
 * logs in, extracts and outreaches to pursuing candidates and then exits
 * with success or failure code
 */
async function logPursuingOutreach(){
    console.time('runtime');
    try{
          // open new browser window and go to desired url
        const browser = await chromium.launch({ headless: false});
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(url);

        // login, extract pursuing and log outreach actions
        await loginToThrive(page);
        const profiles = await extractPursuingCandidates(page);
        const count = await doOutreachActions(profiles, page);
        await browser.close();
        if (count === 0) {
            console.error("Error: no profiles in pursuing stage");
            console.timeEnd('runtime');
            process.exit(1);
        } else {
            console.log(`Succesfully logged ${count} outreach actions`);
            console.timeEnd('runtime');
            process.exit(0);
        }
    }catch(error){
        console.error('Error:', error);
        console.timeEnd('runtime');
        process.exit(1);
    }
}

//define and call simple async function to call logPursuiingOutreach
(async () => {
    await logPursuingOutreach();
})();