import {existsSync} from 'node:fs';
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',workers:1,use:{baseURL:'http://localhost:5173',headless:true,launchOptions:{executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']}},webServer:{command:'APP_MODE=local npm run dev',url:'http://localhost:5173',reuseExistingServer:true,timeout:30000}});
