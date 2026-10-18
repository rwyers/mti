/* MTI Portal — Cloudflare Worker. Source of truth: rwyers/mti. No real student data in source. */
const STATIC = {};
const RUBRIC = [
 ["scripture",5],["practical",10],["bible",5],["outreach",10],
 ["intensive",10],["assignment",30],["attendance",12],["mentorship",12],["groups",6]
];
const BONUS = [["opportunity",5],["growth",10],["videos",12],["confessions",3],["study",3]];
const enc = new TextEncoder();
function json(data,status=200,extra={}) {
 return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",
 "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...extra}});
}
function page(value) {
 return new Response(value,{headers:{"Content-Type":"text/html; charset=utf-8","X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"strict-origin-when-cross-origin","X-Frame-Options":"DENY",
 "Content-Security-Policy":"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"}});
}
const string = (v,max=5000) => String(v==null?"":v).trim().slice(0,max);
const epoch=()=>Math.floor(Date.now()/1000);
const hex = (buf)=>Array.from(new Uint8Array(buf)).map(x=>x.toString(16).padStart(2,"0")).join("");
async function digest(v) {return hex(await crypto.subtle.digest("SHA-256",enc.encode(v)));}
function base64url(input) {
 const bytes=typeof input==="string"?enc.encode(input):new Uint8Array(input);
 let s="";for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);
 return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function decode64(v) {
 const b=atob(v.replace(/-/g,"+").replace(/_/g,"/"));
 return new TextDecoder().decode(Uint8Array.from(b,c=>c.charCodeAt(0)));
}
async function hmac(data,secret) {
 const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return base64url(await crypto.subtle.sign("HMAC",key,enc.encode(data)));
}
function secureEqual(a,b) {
 let x=a.length^b.length;const len=Math.max(a.length,b.length);
 for(let i=0;i<len;i++)x|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
 return x===0;
}
function cookie(request,name) {
 const header=request.headers.get("Cookie")||"";
 const found=header.split(";").map(s=>s.trim()).find(s=>s.startsWith(name+"="));
 return found?found.slice(name.length+1):"";
}
async function isAdmin(req,env) {
 try {
  if(!env.SESSION_SECRET)return false;
  const raw=cookie(req,"mti_session");const parts=raw.split(".");
  if(parts.length!==2)return false;
  const expected=await hmac(parts[0],env.SESSION_SECRET);
  if(!secureEqual(parts[1],expected))return false;
  const payload=JSON.parse(decode64(parts[0]));
  return payload.role==="admin" && payload.exp>epoch();
 }catch{return false;}
}
async function audit(env,action,type,id) {
 await env.DB.prepare("INSERT INTO audit_log (id,action,target_type,target_id) VALUES (?,?,?,?)")
 .bind(crypto.randomUUID(),action,type,id).run();
}
function originOK(req) {
 const origin=req.headers.get("Origin");
 return !!origin&&origin===new URL(req.url).origin&&
  (req.headers.get("Content-Type")||"").includes("application/json");
}
async function payload(req) {
 const body=await req.text();
 if(body.length>30000)throw new Error("Request too large");
 return JSON.parse(body||"{}");
}
async function login(req,env) {
 if(!env.DB||!env.ADMIN_PASSWORD_HASH||!env.SESSION_SECRET)return json({error:"Admin login is being configured."},503);
 if(!originOK(req))return json({error:"Invalid request origin."},403);
 const ip=string(req.headers.get("CF-Connecting-IP")||"unknown",100);
 const ipKey=await digest(ip+":"+env.SESSION_SECRET);
 const row=await env.DB.prepare("SELECT failures,window_started FROM login_attempts WHERE ip_key=?").bind(ipKey).first();
 const now=epoch();const count=(row&&now-row.window_started<900)?row.failures:0;
 if(count>=7)return json({error:"Too many attempts. Try again in 15 minutes."},429);
 const body=await payload(req);const input=string(body.password,256);
 const ok=input.length>=16 && secureEqual(await digest(input),env.ADMIN_PASSWORD_HASH);
 if(!ok) {
  await env.DB.prepare("INSERT INTO login_attempts (ip_key,failures,window_started) VALUES (?,?,?) ON CONFLICT(ip_key) DO UPDATE SET failures=?,window_started=?")
  .bind(ipKey,count+1,(row&&now-row.window_started<900)?row.window_started:now,count+1,(row&&now-row.window_started<900)?row.window_started:now).run();
  return json({error:"Incorrect password."},401);
 }
 await env.DB.prepare("DELETE FROM login_attempts WHERE ip_key=?").bind(ipKey).run();
 const encoded=base64url(JSON.stringify({role:"admin",exp:now+43200}));
 const signed=encoded+"."+(await hmac(encoded,env.SESSION_SECRET));
 return json({ok:true},200,{"Set-Cookie":"mti_session="+signed+"; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Lax"});
}
async function dataset(env) {
 const [course,lesson,student,assignment]=await Promise.all([
 env.DB.prepare("SELECT * FROM courses ORDER BY name").all(),
 env.DB.prepare("SELECT * FROM lessons ORDER BY course_id,year,lesson_number").all(),
 env.DB.prepare("SELECT * FROM students ORDER BY created_at DESC").all(),
 env.DB.prepare("SELECT * FROM assignments ORDER BY created_at DESC").all()
 ]);
 return {courses:course.results,lessons:lesson.results,students:student.results,assignments:assignment.results};
}
async function adminAPI(req,env,path) {
 if(path==="/api/admin/me")return json({authenticated:await isAdmin(req,env)});
 if(path==="/api/admin/login"&&req.method==="POST")return login(req,env);
 if(path==="/api/admin/logout"&&req.method==="POST") {
  if(!originOK(req))return json({error:"Invalid origin"},403);
  return json({ok:true},200,{"Set-Cookie":"mti_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"});
 }
 if(!(await isAdmin(req,env)))return json({error:"Not authenticated"},401);
 if(!env.DB)return json({error:"Database unavailable"},503);
 if(req.method==="GET"&&path==="/api/admin/data")return json(await dataset(env));
 if(req.method!=="POST"&&req.method!=="PATCH")return json({error:"Not found"},404);
 if(!originOK(req))return json({error:"Invalid request origin"},403);
 const b=await payload(req);
 if(req.method==="POST"&&path==="/api/admin/students") {
  const name=string(b.full_name,160),email=string(b.email,190),phone=string(b.phone,80);
  if(name.length<2)return json({error:"Student name is required"},400);
  if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return json({error:"Enter a valid email"},400);
  const id=crypto.randomUUID();
  const year=Math.min(5,Math.max(1,Number(b.current_year)||1));
  await env.DB.prepare("INSERT INTO students (id,full_name,email,phone,course_id,current_year,current_lesson,status,notes) VALUES (?,?,?,?,?,?,?,?,?)")
  .bind(id,name,email,phone,string(b.course_id,60)||null,year,Math.max(1,Number(b.current_lesson)||1),"active",string(b.notes,1000)).run();
  await audit(env,"create","student",id);return json({ok:true,id},201);
 }
 if(req.method==="POST"&&path==="/api/admin/courses") {
  const name=string(b.name,160);if(name.length<2)return json({error:"Course name required"},400);
  const id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO courses (id,name,description) VALUES (?,?,?)").bind(id,name,string(b.description,1000)).run();
  await audit(env,"create","course",id);return json({ok:true,id},201);
 }
 if(req.method==="POST"&&path==="/api/admin/lessons") {
  const id=crypto.randomUUID(),course=string(b.course_id,80);
  const year=Number(b.year),n=Number(b.lesson_number);
  if(!course||!Number.isInteger(year)||year<1||year>5||!Number.isInteger(n)||n<1||n>52)return json({error:"Select a course, year and lesson number"},400);
  await env.DB.prepare("INSERT INTO lessons (id,course_id,year,lesson_number,credits,memory_verse_reference,memory_verse_text,bible_instruction,assignment_instructions,submission_notes,materials_list) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
  .bind(id,course,year,n,Math.max(0,Number(b.credits)||0),string(b.memory_verse_reference,200),
  string(b.memory_verse_text,2000),string(b.bible_instruction,6000),string(b.assignment_instructions,12000),
  string(b.submission_notes,3000),string(b.materials_list,4000)).run();
  await audit(env,"create","lesson",id);return json({ok:true,id},201);
 }
 if(req.method==="POST"&&path==="/api/admin/assignments") {
  const id=crypto.randomUUID(),student=string(b.student_id,80),title=string(b.title,220),lesson=string(b.lesson_id,80);
  if(!student||!title)return json({error:"Select student and assignment title"},400);
  await env.DB.prepare("INSERT INTO assignments (id,student_id,lesson_id,title,due_date,status) VALUES (?,?,?,?,?,?)")
   .bind(id,student,lesson||null,title,string(b.due_date,30),"assigned").run();
  await audit(env,"create","assignment",id);return json({ok:true,id},201);
 }
 if(req.method==="PATCH"&&path.startsWith("/api/admin/assignments/")) {
  const id=path.slice("/api/admin/assignments/".length);
  const status=string(b.status,20);
  if(!["assigned","submitted","graded"].includes(status))return json({error:"Invalid status"},400);
  let grading={},total=null,bonus=null;
  if(status==="graded") {
   const raw=b.grading||{};
   total=0;bonus=0;
   for(const [key,max] of RUBRIC) {
    const n=Number(raw[key]??0);if(!Number.isInteger(n)||n<0||n>max)return json({error:"Invalid score for "+key},400);
    grading[key]=n;total+=n;
   }
   for(const [key,max] of BONUS) {
    const n=Number(raw[key]??0);if(!Number.isInteger(n)||n<0||n>max)return json({error:"Invalid score for "+key},400);
    grading[key]=n;bonus+=n;
   }
  }
  const result=await env.DB.prepare("UPDATE assignments SET status=?,submitted_at=CASE WHEN ?='submitted' AND submitted_at IS NULL THEN CURRENT_TIMESTAMP ELSE submitted_at END,grade_points=?,bonus_points=?,grading_json=?,feedback=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
   .bind(status,status,total,bonus,JSON.stringify(grading),string(b.feedback,3000),id).run();
  if(!result.meta?.changes)return json({error:"Assignment not found"},404);
  await audit(env,"update","assignment",id);return json({ok:true},200);
 }
 return json({error:"Not found"},404);
}
export default {
 async fetch(request,env) {
  const url=new URL(request.url),p=url.pathname.replace(/\/+$/,"")||"/";
  try {
   if(p==="/health")return json({ok:true,service:"MTI Portal"});
   if(p.startsWith("/api/admin/"))return await adminAPI(request,env,p);
   if(request.method!=="GET")return json({error:"Not found"},404);
   if(p==="/")return page(STATIC["/"]||"<h1>MTI — Coming soon</h1>");
   if(p==="/admin")return page(STATIC["/admin"]||"<h1>Admin portal being configured</h1>");
   if(p==="/student")return page(STATIC["/student"]||"<h1>Student portal being configured</h1>");
   return json({error:"Not found"},404);
  }catch(error){
   if(error instanceof SyntaxError)return json({error:"Invalid JSON"},400);
   if(error.message==="Request too large")return json({error:error.message},413);
   console.error("MTI request failed",error.name,error.message);
   if(/UNIQUE constraint failed/i.test(error.message))return json({error:"That record already exists"},409);
   if(/FOREIGN KEY constraint/i.test(error.message))return json({error:"Invalid related record"},400);
   return json({error:"Unable to complete the request"},500);
  }
 }
};
