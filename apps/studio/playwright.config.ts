import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"../../tests/studio/browser",timeout:30000,use:{baseURL:"http://127.0.0.1:3100",headless:true},webServer:{command:"npm run dev -- --hostname 127.0.0.1 --port 3100",cwd:".",url:"http://127.0.0.1:3100",reuseExistingServer:false,timeout:120000},workers:1});
