#!/usr/bin/env node
/**
 * Browser Testing Script
 * Connects to remote Chrome instance and provides testing capabilities
 */

const puppeteer = require('puppeteer');

class BrowserTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async connect() {
    try {
      this.browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: { width: 1280, height: 720 }
      });

      const pages = await this.browser.pages();
      this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();

      console.log('✅ Connected to Chrome on port 9222');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Chrome:', error.message);
      return false;
    }
  }

  async navigateTo(url) {
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      console.log(`✅ Navigated to ${url}`);
      return true;
    } catch (error) {
      console.error(`❌ Navigation failed:`, error.message);
      return false;
    }
  }

  async screenshot(filename = 'screenshot.png') {
    try {
      await this.page.screenshot({ path: filename, fullPage: true });
      console.log(`✅ Screenshot saved to ${filename}`);
      return filename;
    } catch (error) {
      console.error(`❌ Screenshot failed:`, error.message);
      return null;
    }
  }

  async getConsoleLogs() {
    const logs = [];
    this.page.on('console', msg => {
      logs.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });
    return logs;
  }

  async getConsoleErrors() {
    const errors = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          text: msg.text(),
          location: msg.location()
        });
      }
    });
    return errors;
  }

  async evaluateInPage(script) {
    try {
      const result = await this.page.evaluate(script);
      return result;
    } catch (error) {
      console.error(`❌ Evaluation failed:`, error.message);
      return null;
    }
  }

  async clickElement(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      await this.page.click(selector);
      console.log(`✅ Clicked element: ${selector}`);
      return true;
    } catch (error) {
      console.error(`❌ Click failed for ${selector}:`, error.message);
      return false;
    }
  }

  async fillForm(selector, value) {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      await this.page.type(selector, value);
      console.log(`✅ Filled form field: ${selector}`);
      return true;
    } catch (error) {
      console.error(`❌ Fill failed for ${selector}:`, error.message);
      return false;
    }
  }

  async getElementText(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });
      const text = await this.page.$eval(selector, el => el.textContent);
      return text;
    } catch (error) {
      console.error(`❌ Get text failed for ${selector}:`, error.message);
      return null;
    }
  }

  async waitForSelector(selector, timeout = 5000) {
    try {
      await this.page.waitForSelector(selector, { timeout });
      console.log(`✅ Found element: ${selector}`);
      return true;
    } catch (error) {
      console.error(`❌ Element not found: ${selector}`);
      return false;
    }
  }

  async getPageInfo() {
    try {
      const info = await this.page.evaluate(() => {
        return {
          title: document.title,
          url: window.location.href,
          readyState: document.readyState,
          components: {
            globalStore: !!document.querySelector('global-store'),
            jobManager: !!document.querySelector('job-manager'),
            resumeEditor: !!document.querySelector('resume-editor'),
            aiAssistant: !!document.querySelector('ai-assistant-worker')
          }
        };
      });
      return info;
    } catch (error) {
      console.error(`❌ Failed to get page info:`, error.message);
      return null;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.disconnect();
      console.log('✅ Disconnected from Chrome');
    }
  }
}

// CLI Usage
async function main() {
  const tester = new BrowserTester();
  const connected = await tester.connect();

  if (!connected) {
    process.exit(1);
  }

  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  switch (command) {
    case 'navigate':
      await tester.navigateTo(arg1 || 'http://localhost:3000/app.html');
      break;

    case 'screenshot':
      await tester.screenshot(arg1 || 'screenshot.png');
      break;

    case 'info':
      const info = await tester.getPageInfo();
      console.log(JSON.stringify(info, null, 2));
      break;

    case 'click':
      await tester.clickElement(arg1);
      break;

    case 'fill':
      await tester.fillForm(arg1, arg2);
      break;

    case 'text':
      const text = await tester.getElementText(arg1);
      console.log(text);
      break;

    case 'eval':
      const result = await tester.evaluateInPage(arg1);
      console.log(result);
      break;

    case 'test':
      // Run a full test suite
      await tester.navigateTo('http://localhost:3000/app.html');
      await new Promise(resolve => setTimeout(resolve, 2000));
      await tester.screenshot('test-initial.png');
      const pageInfo = await tester.getPageInfo();
      console.log('Page Info:', JSON.stringify(pageInfo, null, 2));
      break;

    default:
      console.log('Usage: node browser-test.js <command> [args]');
      console.log('Commands:');
      console.log('  navigate <url>           - Navigate to URL');
      console.log('  screenshot <filename>    - Take a screenshot');
      console.log('  info                     - Get page information');
      console.log('  click <selector>         - Click an element');
      console.log('  fill <selector> <value>  - Fill a form field');
      console.log('  text <selector>          - Get element text');
      console.log('  eval <script>            - Evaluate JavaScript');
      console.log('  test                     - Run full test suite');
  }

  await tester.close();
}

// Export for programmatic use
module.exports = BrowserTester;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
