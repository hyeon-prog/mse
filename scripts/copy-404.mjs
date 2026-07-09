// GitHub Pages SPA 폴백: 새로고침/직접 URL 접근 시 404 대신 앱을 서빙한다
import { copyFileSync } from "node:fs";
copyFileSync("dist/index.html", "dist/404.html");
console.log("dist/404.html created for SPA fallback");
