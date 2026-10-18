// Builds a single Cloudflare Worker from files stored in this GitHub repository.
// Run by Cloudflare's remote build service when Git integration is enabled.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const worker=readFileSync("src/worker.js","utf8");
const files={"/": "public/index.html", "/admin": "public/admin.html", "/student": "public/student.html"};
const pages=Object.fromEntries(Object.entries(files).map(([key, file]) => [key,readFileSync(file,"utf8")]));
const adminEnhancements=readFileSync("src/admin-v2.js","utf8");
if(!pages["/admin"].includes("/*__MTI_ADMIN_V2__*/"))throw new Error("Admin enhancement injection point missing");
pages["/admin"]=pages["/admin"].replace("/*__MTI_ADMIN_V2__*/",adminEnhancements);
const marker="const STATIC = {};";
if(!worker.includes(marker))throw new Error("MTI asset build marker not found");
mkdirSync("dist",{recursive:true});
const curriculumImporter=readFileSync("src/curriculum-import.js","utf8");
writeFileSync("dist/worker.js",worker.replace(marker,"const STATIC = "+JSON.stringify(pages)+";")+"\n"+curriculumImporter,"utf8");
console.log("Built MTI Cloudflare Worker from GitHub sources");
