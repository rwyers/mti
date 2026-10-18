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

const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function originOK(req){const o=req.headers.get("Origin");return !!o&&o===new URL(req.url).origin&&(req.headers.get("Content-Type")||"").includes("application/json")}
async function payload(req){const b=await req.text();if(b.length>60000)throw new Error("Request too large");return JSON.parse(b||"{}")}
function snapshot(v){return v?JSON.stringify(v):null}
const COOKIE="mti_session";
function cookieDelete(){return COOKIE+"=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"}
function randomSecret(){return base64url(crypto.getRandomValues(new Uint8Array(32)))}
async function passwordKey(password,salt,iterations=120000){
 const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
 const bytes=await crypto.subtle.deriveBits({name:"PBKDF2",salt:enc.encode(salt),iterations,hash:"SHA-256"},key,256);
 return hex(bytes);
}
async function passwordMatches(input,account){
 if(!account || !account.password_hash || !input)return false;
 // A single-use transition from the old MTI administrator credential.
 // New and changed passwords always use a per-account salted PBKDF2 hash.
 if(account.password_salt==="legacy-sha256")return secureEqual(await digest(input),account.password_hash);
 return secureEqual(await passwordKey(input,account.password_salt,account.password_iter||120000),account.password_hash);
}
function validPassword(v){return typeof v==="string" && v.length>=12&&v.length<=128}
async function sessionCookie(env,user) {
 const data=base64url(JSON.stringify({uid:user.id,v:user.session_version,exp:epoch()+43200}));
 return COOKIE+"="+data+"."+(await hmac(data,env.SESSION_SECRET))+"; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=Lax";
}
async function currentUser(req,env){
 try {
  const parts=cookie(req,COOKIE).split(".");if(parts.length!==2)return null;
  const expected=await hmac(parts[0],env.SESSION_SECRET);
  if(!secureEqual(expected,parts[1]))return null;
  const data=JSON.parse(decode64(parts[0]));
  if(!data.uid||data.exp<=epoch())return null;
  const account=await env.DB.prepare("SELECT * FROM user_accounts WHERE id=? AND active=1").bind(data.uid).first();
  if(!account||data.v!==account.session_version)return null;
  return account;
 }catch{return null}
}
function safeAccount(x){return x?{id:x.id,name:x.name,email:x.email,role:x.role,student_id:x.student_id,
 active:!!x.active,invited:!x.password_hash,created_at:x.created_at,last_login_at:x.last_login_at,must_change_password:!!x.must_change_password}:null}
async function auditAction(env,actor,action,type,id,before=null,after=null) {
 await env.DB.prepare("INSERT INTO audit_events (id,actor_id,actor_name,actor_email,actor_role,action,target_type,target_id,before_json,after_json) VALUES (?,?,?,?,?,?,?,?,?,?)")
 .bind(crypto.randomUUID(),actor?.id||null,actor?.name||"System",actor?.email||"",actor?.role||"system",
 action,type,id,snapshot(before),snapshot(after)).run();
}
async function rateLimit(env,req,scope) {
 const key=await digest(string(req.headers.get("CF-Connecting-IP")||"unknown",100)+":"+scope+":"+env.SESSION_SECRET);
 const now=epoch(),row=await env.DB.prepare("SELECT failures,window_started FROM login_attempts WHERE ip_key=?").bind(key).first();
 const start=row&&now-row.window_started<900?row.window_started:now;
 const count=start===row?.window_started?row.failures:0;
 if(count>=7)return {limited:true};
 return {key,now,start,count};
}
async function failLogin(env,r){
 await env.DB.prepare("INSERT INTO login_attempts(ip_key,failures,window_started) VALUES(?,?,?) ON CONFLICT(ip_key) DO UPDATE SET failures=?,window_started=?")
 .bind(r.key,r.count+1,r.start,r.count+1,r.start).run();
}
async function authLogin(req,env,role){
 if(!originOK(req))return json({error:"Invalid request origin"},403);
 const b=await payload(req),email=string(b.email,190).toLowerCase(),password=String(b.password||"");
 const rate=await rateLimit(env,req,role+":"+email);if(rate.limited)return json({error:"Too many attempts. Try again in 15 minutes."},429);
 let account=null;
 if(role==="admin"){
  const count=await env.DB.prepare("SELECT COUNT(*) n FROM user_accounts WHERE role IN ('owner','admin','teacher')").first();
  if(!count.n && password.length>=16&&env.ADMIN_PASSWORD_HASH&&secureEqual(await digest(password),env.ADMIN_PASSWORD_HASH)){
   // Keep first-time setup on the original verified SHA-256 credential.
   // The mandatory password-change screen upgrades it to salted PBKDF2.
   // This avoids an expensive password-derivation step in the one-time migration.
   const id=crypto.randomUUID();
   await env.DB.prepare("INSERT INTO user_accounts (id,name,email,role,password_hash,password_salt,must_change_password) VALUES (?,?,?,?,?,?,1)")
    .bind(id,"Primary Administrator","rwyers@gmail.com","owner",env.ADMIN_PASSWORD_HASH,"legacy-sha256").run();
   account=await env.DB.prepare("SELECT * FROM user_accounts WHERE id=?").bind(id).first();
   await auditAction(env,account,"bootstrap","administrator",id,null,{email:account.email,role:account.role});
  }
 }
 if(!account&&email)account=await env.DB.prepare("SELECT * FROM user_accounts WHERE email=? AND active=1").bind(email).first();
 if(!account||!(role==="admin"?["owner","admin","teacher"].includes(account.role):account.role==="student")||!(await passwordMatches(password,account))) {
  await failLogin(env,rate);return json({error:"Email or password incorrect."},401);
 }
 await env.DB.prepare("DELETE FROM login_attempts WHERE ip_key=?").bind(rate.key).run();
 await env.DB.prepare("UPDATE user_accounts SET last_login_at=CURRENT_TIMESTAMP WHERE id=?").bind(account.id).run();
 await auditAction(env,account,"sign_in","account",account.id);
 return json({ok:true,user:safeAccount(account)},200,{"Set-Cookie":await sessionCookie(env,account)});
}
async function acceptInvite(req,env){
 if(!originOK(req))return json({error:"Invalid request origin"},403);
 const b=await payload(req),token=string(b.token,200),password=String(b.password||"");
 if(!validPassword(password))return json({error:"Password must be at least 12 characters."},400);
 if(token.length<20)return json({error:"Invalid invitation link."},400);
 const invite=await env.DB.prepare("SELECT * FROM account_invitations WHERE token_hash=? AND redeemed_at IS NULL AND expires_at>?").bind(await digest(token),epoch()).first();
 if(!invite)return json({error:"Invitation is invalid or expired. Ask an administrator for a new link."},400);
 const account=await env.DB.prepare("SELECT * FROM user_accounts WHERE id=? AND active=1").bind(invite.account_id).first();
 if(!account)return json({error:"Account is unavailable."},400);
 const salt=randomSecret(),password_hash=await passwordKey(password,salt);
 const done=await env.DB.prepare("UPDATE account_invitations SET redeemed_at=CURRENT_TIMESTAMP WHERE id=? AND redeemed_at IS NULL").bind(invite.id).run();
 if(!done.meta?.changes)return json({error:"Invitation has already been used."},400);
 await env.DB.prepare("UPDATE user_accounts SET password_hash=?,password_salt=?,session_version=session_version+1,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE id=?")
 .bind(password_hash,salt,account.id).run();
 const updated=await env.DB.prepare("SELECT * FROM user_accounts WHERE id=?").bind(account.id).first();
 await auditAction(env,updated,"activate_account","account",account.id,null,{email:updated.email,role:updated.role});
 return json({ok:true,user:safeAccount(updated)},200,{"Set-Cookie":await sessionCookie(env,updated)});
}
async function changePassword(req,env,account){
 if(!originOK(req))return json({error:"Invalid request origin"},403);
 const b=await payload(req),old=String(b.old_password||""),next=String(b.new_password||"");
 if(!validPassword(next))return json({error:"Choose a password at least 12 characters long."},400);
 if(!(await passwordMatches(old,account)))return json({error:"Current password is incorrect."},403);
 if(secureEqual(old,next))return json({error:"Choose a different password."},400);
 const salt=randomSecret(),pass=await passwordKey(next,salt);
 await env.DB.prepare("UPDATE user_accounts SET password_hash=?,password_salt=?,session_version=session_version+1,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE id=?")
  .bind(pass,salt,account.id).run();
 const updated=await env.DB.prepare("SELECT * FROM user_accounts WHERE id=?").bind(account.id).first();
 await auditAction(env,account,"change_password","account",account.id);
 return json({ok:true},200,{"Set-Cookie":await sessionCookie(env,updated)});
}
async function createInvite(env,account,actor,type){
 const raw=randomSecret();
 await env.DB.prepare("UPDATE account_invitations SET expires_at=0 WHERE account_id=? AND redeemed_at IS NULL").bind(account.id).run();
 await env.DB.prepare("INSERT INTO account_invitations(id,account_id,token_hash,expires_at,created_by) VALUES(?,?,?,?,?)")
 .bind(crypto.randomUUID(),account.id,await digest(raw),epoch()+7*86400,actor.id).run();
 await auditAction(env,actor,"send_invitation",type,account.id,null,{email:account.email,expires_in_days:7});
 return raw;
}
async function dataset(env){
 const [courses,lessons,students,assignments,submissions,files]=await Promise.all([
 env.DB.prepare("SELECT * FROM courses ORDER BY name").all(),
 env.DB.prepare("SELECT * FROM lessons ORDER BY course_id,year,lesson_number").all(),
 env.DB.prepare("SELECT * FROM students ORDER BY created_at DESC").all(),
 env.DB.prepare("SELECT * FROM assignments ORDER BY created_at DESC").all(),
 env.DB.prepare("SELECT id,assignment_id,student_id,response_text,submitted_at,updated_at FROM assignment_submissions ORDER BY submitted_at DESC").all(),
 env.DB.prepare("SELECT id,assignment_id,student_id,filename,content_type,size_bytes,created_at FROM submission_files ORDER BY created_at DESC").all()
 ]);
 return {courses:courses.results,lessons:lessons.results,students:students.results,assignments:assignments.results,submissions:submissions.results,files:files.results};
}
async function adminAPI(req,env,path){
 if(path==="/api/admin/login"&&req.method==="POST")return authLogin(req,env,"admin");
 if(path==="/api/admin/me") {
  const u=await currentUser(req,env);
  return json({authenticated:!!u&&u.role!=="student",user:u?.role!=="student"?safeAccount(u):null});
 }
 if(path==="/api/admin/logout"&&req.method==="POST"){
  if(!originOK(req))return json({error:"Invalid request origin"},403);
  return json({ok:true},200,{"Set-Cookie":cookieDelete()});
 }
 const u=await currentUser(req,env);
 if(!u||u.role==="student")return json({error:"Not authenticated"},401);
 if(path==="/api/admin/change-password"&&req.method==="POST")return changePassword(req,env,u);
 if(u.must_change_password)return json({error:"Change your administrator password before continuing.",password_change_required:true},403);
 if(path==="/api/admin/data"&&req.method==="GET")return json(await dataset(env));
 if(path==="/api/admin/curriculum/import-status"&&req.method==="GET"){
  if(u.role!=="owner"&&u.role!=="admin")return json({error:"Only administrators may import curriculum"},403);
  return json({sources:IMPORT_SOURCES.map(s=>({course:s.course,years:s.years})),counts:await curriculumCount(env)});
 }
 if(path==="/api/admin/curriculum/import-year"&&req.method==="POST"){
  if(u.role!=="owner"&&u.role!=="admin")return json({error:"Only administrators may import curriculum"},403);
  if(!originOK(req))return json({error:"Invalid request origin"},403);
  const b=await payload(req);
  try{return json(await importPublishedYear(env,string(b.course,160),Number(b.year),u));}
  catch(err){return json({error:"Curriculum import failed: "+err.message},422);}
 }
 if(path.startsWith("/api/admin/files/")&&req.method==="GET")return fileDownload(env,path.split("/")[4],u);
 if(path==="/api/admin/accounts"&&req.method==="GET") {
  if(u.role==="teacher")return json({error:"Not authorized"},403);
  const r=await env.DB.prepare("SELECT * FROM user_accounts WHERE role IN('owner','admin','teacher') ORDER BY created_at").all();
  return json({accounts:r.results.map(safeAccount)});
 }
 if(path==="/api/admin/audit"&&req.method==="GET"){
  const r=await env.DB.prepare("SELECT id,actor_name,actor_email,actor_role,action,target_type,target_id,before_json,after_json,created_at FROM audit_events ORDER BY created_at DESC,id DESC LIMIT 200").all();
  return json({events:r.results});
 }
 if(req.method!=="POST"&&req.method!=="PATCH")return json({error:"Not found"},404);
 if(!originOK(req))return json({error:"Invalid request origin"},403);
 const b=await payload(req);
 if(path==="/api/admin/accounts"&&req.method==="POST"){
  if(u.role==="teacher")return json({error:"Only administrators can invite staff."},403);
  const email=string(b.email,190).toLowerCase(),name=string(b.name,150),role=string(b.role,20);
  if(!isEmail(email)||name.length<2||!["admin","teacher"].includes(role))return json({error:"Name, valid email and role are required."},400);
  const id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO user_accounts(id,name,email,role) VALUES(?,?,?,?)").bind(id,name,email,role).run();
  const account=await env.DB.prepare("SELECT * FROM user_accounts WHERE id=?").bind(id).first();
  await auditAction(env,u,"create","administrator",id,null,safeAccount(account));
  return json({ok:true,invite_url:"/admin?invite="+(await createInvite(env,account,u,"administrator"))},201);
 }
 if(path.startsWith("/api/admin/accounts/")&&path.endsWith("/invite")&&req.method==="POST"){
  if(u.role==="teacher")return json({error:"Not authorized"},403);
  const id=path.split("/")[4],a=await env.DB.prepare("SELECT * FROM user_accounts WHERE id=? AND role!='student'").bind(id).first();
  if(!a)return json({error:"Account not found"},404);
  if(a.role==="owner"&&u.role!=="owner")return json({error:"Owner accounts may only be managed by an owner."},403);
  await env.DB.prepare("UPDATE user_accounts SET password_hash=NULL,password_salt=NULL,session_version=session_version+1 WHERE id=?").bind(id).run();
  return json({ok:true,invite_url:"/admin?invite="+(await createInvite(env,a,u,"administrator"))});
 }
 if(path.startsWith("/api/admin/accounts/")&&req.method==="PATCH"){
  if(u.role==="teacher")return json({error:"Not authorized"},403);
  const id=path.split("/")[4],before=await env.DB.prepare("SELECT * FROM user_accounts WHERE id=? AND role!='student'").bind(id).first();
  if(!before)return json({error:"Account not found"},404);
  if(before.role==="owner"&&u.role!=="owner")return json({error:"Owner accounts may only be managed by an owner."},403);
  if(id===u.id)return json({error:"Use My Profile to change your own password."},400);
  const active=b.active===true||b.active===1||b.active==="1";
  if(before.role==="owner"&&!active){
   const owners=await env.DB.prepare("SELECT COUNT(*) n FROM user_accounts WHERE role='owner' AND active=1").first();
   if(owners.n<=1)return json({error:"Cannot disable the last owner."},400);
  }
  await env.DB.prepare("UPDATE user_accounts SET active=?,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(active?1:0,id).run();
  await auditAction(env,u,active?"enable":"disable","administrator",id,{active:!!before.active},{active});
  return json({ok:true});
 }
 if(path==="/api/admin/students"&&req.method==="POST"){
  const name=string(b.full_name,160),email=string(b.email,190).toLowerCase(),phone=string(b.phone,80);
  if(name.length<2)return json({error:"Student name required"},400);
  if(email&&!isEmail(email))return json({error:"Invalid student email"},400);
  const id=crypto.randomUUID(),year=Math.min(5,Math.max(1,Number(b.current_year)||1));
  await env.DB.prepare("INSERT INTO students(id,full_name,email,phone,course_id,current_year,current_lesson,status,notes) VALUES(?,?,?,?,?,?,?,?,?)")
   .bind(id,name,email,phone,string(b.course_id,80)||null,year,Math.max(1,Number(b.current_lesson)||1),"active",string(b.notes,1000)).run();
  await auditAction(env,u,"create","student",id,null,{full_name:name,email,course_id:b.course_id||null,current_year:year});
  return json({ok:true,id},201);
 }
 if(path==="/api/admin/invite-student"&&req.method==="POST"){
  const s=await env.DB.prepare("SELECT * FROM students WHERE id=?").bind(string(b.student_id,80)).first();
  if(!s||!s.email||!isEmail(s.email))return json({error:"Student must have a valid email address."},400);
  if(s.status!=="active")return json({error:"Student must be active."},400);
  let account=await env.DB.prepare("SELECT * FROM user_accounts WHERE student_id=?").bind(s.id).first();
  if(!account){
   const id=crypto.randomUUID();
   await env.DB.prepare("INSERT INTO user_accounts(id,name,email,role,student_id) VALUES(?,?,?,'student',?)")
   .bind(id,s.full_name,s.email.toLowerCase(),s.id).run();
   account=await env.DB.prepare("SELECT * FROM user_accounts WHERE id=?").bind(id).first();
  }else{
   await env.DB.prepare("UPDATE user_accounts SET password_hash=NULL,password_salt=NULL,active=1,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(account.id).run();
  }
  return json({ok:true,invite_url:"/student?invite="+(await createInvite(env,account,u,"student"))});
 }
 if(path.startsWith("/api/admin/students/")&&req.method==="PATCH"){
  const id=path.split("/")[4],before=await env.DB.prepare("SELECT * FROM students WHERE id=?").bind(id).first();
  if(!before)return json({error:"Student not found"},404);
  const name=string(b.full_name,160),email=string(b.email,190).toLowerCase(),status=string(b.status,30);
  if(name.length<2||(email&&!isEmail(email))||!["active","inactive"].includes(status))return json({error:"Invalid student details"},400);
  const yr=Number(b.current_year),lesson=Number(b.current_lesson);
  if(!Number.isInteger(yr)||yr<1||yr>5||!Number.isInteger(lesson)||lesson<1)return json({error:"Invalid year or lesson"},400);
  const course=string(b.course_id,80)||null,phone=string(b.phone,80),notes=string(b.notes,1000);
  await env.DB.prepare("UPDATE students SET full_name=?,email=?,phone=?,course_id=?,current_year=?,current_lesson=?,status=?,notes=? WHERE id=?")
  .bind(name,email,phone,course,yr,lesson,status,notes,id).run();
  const user=await env.DB.prepare("SELECT * FROM user_accounts WHERE student_id=?").bind(id).first();
  if(user){
   await env.DB.prepare("UPDATE user_accounts SET name=?,email=?,active=?,session_version=session_version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(name,email,status==="active"?1:0,user.id).run();
  }
  await auditAction(env,u,"update","student",id,before,{...before,full_name:name,email,phone,course_id:course,current_year:yr,current_lesson:lesson,status,notes});
  return json({ok:true});
 }
 if(path==="/api/admin/courses"&&req.method==="POST"){
  const name=string(b.name,160);if(name.length<2)return json({error:"Course name required"},400);
  const id=crypto.randomUUID(),description=string(b.description,1000);
  await env.DB.prepare("INSERT INTO courses(id,name,description) VALUES(?,?,?)").bind(id,name,description).run();
  await auditAction(env,u,"create","course",id,null,{name,description});return json({ok:true,id},201);
 }
 if(path.startsWith("/api/admin/courses/")&&req.method==="PATCH"){
  const id=path.split("/")[4],before=await env.DB.prepare("SELECT * FROM courses WHERE id=?").bind(id).first();
  if(!before)return json({error:"Course not found"},404);
  const name=string(b.name,160),description=string(b.description,1000);
  if(name.length<2)return json({error:"Course name required"},400);
  await env.DB.prepare("UPDATE courses SET name=?,description=? WHERE id=?").bind(name,description,id).run();
  await auditAction(env,u,"update","course",id,before,{...before,name,description});return json({ok:true});
 }
 if(path==="/api/admin/lessons"&&req.method==="POST"){
  const id=crypto.randomUUID(),course=string(b.course_id,80);
  const year=Number(b.year),n=Number(b.lesson_number);
  if(!course||!Number.isInteger(year)||year<1||year>5||!Number.isInteger(n)||n<1||n>52)return json({error:"Choose course, year and lesson"},400);
  await env.DB.prepare("INSERT INTO lessons(id,course_id,year,lesson_number,credits,memory_verse_reference,memory_verse_text,bible_instruction,assignment_instructions,submission_notes,materials_list) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
  .bind(id,course,year,n,Math.max(0,Number(b.credits)||0),string(b.memory_verse_reference,200),string(b.memory_verse_text,2000),string(b.bible_instruction,6000),string(b.assignment_instructions,12000),string(b.submission_notes,3000),string(b.materials_list,4000)).run();
  await auditAction(env,u,"create","lesson",id,null,{course_id:course,year,lesson_number:n});return json({ok:true,id},201);
 }
 if(path.startsWith("/api/admin/lessons/")&&req.method==="PATCH"){
  const id=path.split("/")[4],before=await env.DB.prepare("SELECT * FROM lessons WHERE id=?").bind(id).first();
  if(!before)return json({error:"Lesson not found"},404);
  const course=string(b.course_id,80),year=Number(b.year),n=Number(b.lesson_number);
  if(!course||!Number.isInteger(year)||year<1||year>5||!Number.isInteger(n)||n<1||n>52)return json({error:"Invalid lesson details"},400);
  const after={...before,course_id:course,year,lesson_number:n,credits:Math.max(0,Number(b.credits)||0),
   memory_verse_reference:string(b.memory_verse_reference,200),memory_verse_text:string(b.memory_verse_text,2000),
   bible_instruction:string(b.bible_instruction,6000),assignment_instructions:string(b.assignment_instructions,12000),
   submission_notes:string(b.submission_notes,3000),materials_list:string(b.materials_list,4000)};
  await env.DB.prepare("UPDATE lessons SET course_id=?,year=?,lesson_number=?,credits=?,memory_verse_reference=?,memory_verse_text=?,bible_instruction=?,assignment_instructions=?,submission_notes=?,materials_list=? WHERE id=?")
   .bind(after.course_id,after.year,after.lesson_number,after.credits,after.memory_verse_reference,after.memory_verse_text,after.bible_instruction,after.assignment_instructions,after.submission_notes,after.materials_list,id).run();
  await auditAction(env,u,"update","lesson",id,before,after);return json({ok:true});
 }
 if(path==="/api/admin/assignments"&&req.method==="POST"){
  const id=crypto.randomUUID(),student=string(b.student_id,80),title=string(b.title,220),lesson=string(b.lesson_id,80);
  if(!student||title.length<2)return json({error:"Choose student and title"},400);
  await env.DB.prepare("INSERT INTO assignments(id,student_id,lesson_id,title,due_date,status) VALUES(?,?,?,?,?,?)")
  .bind(id,student,lesson||null,title,string(b.due_date,30),"assigned").run();
  await auditAction(env,u,"create","assignment",id,null,{student_id:student,lesson_id:lesson,title,due_date:string(b.due_date,30)});
  return json({ok:true,id},201);
 }
 if(req.method==="PATCH"&&path.startsWith("/api/admin/assignments/")){
  const id=path.split("/")[4],before=await env.DB.prepare("SELECT * FROM assignments WHERE id=?").bind(id).first();
  if(!before)return json({error:"Assignment not found"},404);
  const status=string(b.status,20);if(!["assigned","submitted","graded"].includes(status))return json({error:"Invalid status"},400);
  let grading={},total=null,bonus=null;
  if(status==="graded"){
   total=0;bonus=0;
   for(const [key,max] of RUBRIC){const n=Number(b.grading?.[key]??0);if(!Number.isInteger(n)||n<0||n>max)return json({error:"Invalid score for "+key},400);grading[key]=n;total+=n}
   for(const [key,max] of BONUS){const n=Number(b.grading?.[key]??0);if(!Number.isInteger(n)||n<0||n>max)return json({error:"Invalid score for "+key},400);grading[key]=n;bonus+=n}
  }
  const feedback=string(b.feedback,3000);
  await env.DB.prepare("UPDATE assignments SET status=?,submitted_at=CASE WHEN ?='submitted' AND submitted_at IS NULL THEN CURRENT_TIMESTAMP ELSE submitted_at END,grade_points=?,bonus_points=?,grading_json=?,feedback=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
  .bind(status,status,total,bonus,JSON.stringify(grading),feedback,id).run();
  await auditAction(env,u,status==="graded"?"grade":"update","assignment",id,
  {status:before.status,grade_points:before.grade_points,bonus_points:before.bonus_points,feedback:before.feedback,grading_json:before.grading_json},
  {status,grade_points:total,bonus_points:bonus,feedback,grading_json:JSON.stringify(grading)});
  return json({ok:true});
 }
 return json({error:"Not found"},404);
}

function fileOriginOK(req){const o=req.headers.get("Origin");return !!o&&o===new URL(req.url).origin}
function safeFileName(raw){
 try{return decodeURIComponent(raw||"").replace(/[/\\\r\n\t\x00-\x1f]/g,"_").slice(0,165).trim()}
 catch{return ""}
}
async function fileDownload(env,id,user){
 const file=await env.DB.prepare("SELECT * FROM submission_files WHERE id=?").bind(id).first();
 if(!file || (user.role==="student"&&file.student_id!==user.student_id))return json({error:"File not found"},404);
 const object=await env.FILES.get(file.object_key);
 if(!object)return json({error:"File unavailable"},404);
 const safe=file.filename.replace(/[\u0000-\u001f"\\]/g,"_");
 return new Response(object.body,{headers:{
  "Content-Type":"application/octet-stream",
  "Content-Disposition":"attachment; filename=\""+safe+"\"; filename*=UTF-8''"+encodeURIComponent(file.filename),
  "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",
  "Content-Security-Policy":"sandbox"
 }});
}
async function studentFileAPI(req,env,path,user){
 const segments=path.split("/"),fileId=segments[4];
 if(req.method==="GET"&&segments[3]==="files")return fileDownload(env,fileId,user);
 if(req.method==="DELETE"&&segments[3]==="files"){
  if(!fileOriginOK(req))return json({error:"Invalid request origin"},403);
  const f=await env.DB.prepare("SELECT * FROM submission_files WHERE id=? AND student_id=?").bind(fileId,user.student_id).first();
  if(!f)return json({error:"File not found"},404);
  const a=await env.DB.prepare("SELECT status FROM assignments WHERE id=? AND student_id=?").bind(f.assignment_id,user.student_id).first();
  if(!a||a.status==="graded")return json({error:"Graded assignment files cannot be removed"},409);
  await env.FILES.delete(f.object_key);
  await env.DB.prepare("DELETE FROM submission_files WHERE id=?").bind(f.id).run();
  await auditAction(env,user,"delete_file","assignment",f.assignment_id,{filename:f.filename});
  return json({ok:true});
 }
 if(req.method==="POST"&&segments[3]==="assignments"&&segments[5]==="files"){
  if(!fileOriginOK(req))return json({error:"Invalid request origin"},403);
  const id=fileId;
  const a=await env.DB.prepare("SELECT * FROM assignments WHERE id=? AND student_id=?").bind(id,user.student_id).first();
  if(!a)return json({error:"Assignment not found"},404);
  if(a.status==="graded")return json({error:"The assignment has already been graded."},409);
  const existing=await env.DB.prepare("SELECT COUNT(*) n FROM submission_files WHERE assignment_id=?").bind(id).first();
  if(existing.n>=5)return json({error:"Maximum five files per assignment"},400);
  const mime=(req.headers.get("Content-Type")||"").split(";")[0].toLowerCase();
  const valid={"application/pdf":[".pdf"],"application/vnd.openxmlformats-officedocument.wordprocessingml.document":[".docx"],
  "text/plain":[".txt"],"image/png":[".png"],"image/jpeg":[".jpg",".jpeg"]};
  const filename=safeFileName(req.headers.get("X-MTI-File-Name"));
  if(!filename||!valid[mime]?.some(ext=>filename.toLowerCase().endsWith(ext)))return json({error:"Allowed files: PDF, DOCX, TXT, JPG, PNG."},400);
  const size=Number(req.headers.get("Content-Length")||0);
  if(size>6*1024*1024)return json({error:"Maximum file size is 6 MB."},413);
  const bytes=await req.arrayBuffer();
  if(!bytes.byteLength||bytes.byteLength>6*1024*1024)return json({error:"Invalid file size (6 MB maximum)."},413);
  const fileId=crypto.randomUUID(),key="students/"+user.student_id+"/"+id+"/"+fileId;
  await env.FILES.put(key,bytes,{httpMetadata:{contentType:mime}});
  await env.DB.prepare("INSERT INTO submission_files(id,assignment_id,student_id,object_key,filename,content_type,size_bytes) VALUES(?,?,?,?,?,?,?)")
   .bind(fileId,id,user.student_id,key,filename,mime,bytes.byteLength).run();
  await auditAction(env,user,"upload_file","assignment",id,null,{file_id:fileId,filename,size_bytes:bytes.byteLength});
  return json({ok:true,id:fileId,filename});
 }
 return json({error:"Not found"},404);
}
async function studentAPI(req,env,path) {
 if(path==="/api/student/login"&&req.method==="POST")return authLogin(req,env,"student");
 if(path==="/api/student/me"){
  const u=await currentUser(req,env);
  return json({authenticated:!!u&&u.role==="student",user:u?.role==="student"?safeAccount(u):null});
 }
 if(path==="/api/student/logout"&&req.method==="POST"){
  if(!originOK(req))return json({error:"Invalid request origin"},403);
  return json({ok:true},200,{"Set-Cookie":cookieDelete()});
 }
 const user=await currentUser(req,env);
 if(!user||user.role!=="student"||!user.student_id)return json({error:"Please sign in."},401);
 if(path.startsWith("/api/student/files/")||path.includes("/files"))return studentFileAPI(req,env,path,user);
 if(path==="/api/student/change-password"&&req.method==="POST")return changePassword(req,env,user);
 if(path==="/api/student/data"&&req.method==="GET"){
  const s=await env.DB.prepare("SELECT s.id,s.full_name,s.email,s.course_id,s.current_year,s.current_lesson,s.status,c.name AS course_name FROM students s LEFT JOIN courses c ON c.id=s.course_id WHERE s.id=?").bind(user.student_id).first();
  const assignments=await env.DB.prepare("SELECT a.*, l.course_id,c.name AS course_name,l.year,l.lesson_number,l.credits,l.memory_verse_reference,l.memory_verse_text,l.bible_instruction,l.assignment_instructions,l.submission_notes,l.materials_list,s.response_text,s.submitted_at AS response_submitted_at FROM assignments a LEFT JOIN lessons l ON l.id=a.lesson_id LEFT JOIN courses c ON c.id=l.course_id LEFT JOIN assignment_submissions s ON s.assignment_id=a.id WHERE a.student_id=? ORDER BY a.created_at DESC").bind(user.student_id).all();
  const files=await env.DB.prepare("SELECT id,assignment_id,filename,content_type,size_bytes,created_at FROM submission_files WHERE student_id=? ORDER BY created_at DESC").bind(user.student_id).all();
  return json({student:s,assignments:assignments.results,files:files.results});
 }
 if(path.startsWith("/api/student/assignments/")&&path.endsWith("/submit")&&req.method==="POST"){
  if(!originOK(req))return json({error:"Invalid request origin"},403);
  const id=path.split("/")[4],a=await env.DB.prepare("SELECT * FROM assignments WHERE id=? AND student_id=?").bind(id,user.student_id).first();
  if(!a)return json({error:"Assignment not found"},404);
  if(a.status==="graded")return json({error:"This work has already been graded. Contact your instructor."},409);
  const b=await payload(req),response=string(b.response_text,20000);
  if(response.length<5){const f=await env.DB.prepare("SELECT COUNT(*) n FROM submission_files WHERE assignment_id=? AND student_id=?").bind(id,user.student_id).first();if(!f.n)return json({error:"Please write your response or upload a file before submitting."},400)}
  await env.DB.prepare("INSERT INTO assignment_submissions(id,assignment_id,student_id,response_text) VALUES(?,?,?,?) ON CONFLICT(assignment_id) DO UPDATE SET response_text=excluded.response_text,updated_at=CURRENT_TIMESTAMP,submitted_at=CURRENT_TIMESTAMP")
  .bind(crypto.randomUUID(),id,user.student_id,response).run();
  await env.DB.prepare("UPDATE assignments SET status='submitted',submitted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  await auditAction(env,user,a.status==="submitted"?"resubmit":"submit","assignment",id,{status:a.status},{status:"submitted",characters:response.length});
  return json({ok:true});
 }
 return json({error:"Not found"},404);
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),p=url.pathname.replace(/\/+$/,"")||"/";
  try{
   if(p==="/health")return json({ok:true,service:"MTI Portal",version:"3"});
   if(p==="/health/source-check")return json(await curriculumProbe());
   if(p==="/api/auth/accept-invite"&&request.method==="POST")return await acceptInvite(request,env);
   if(p.startsWith("/api/admin/"))return await adminAPI(request,env,p);
   if(p.startsWith("/api/student/"))return await studentAPI(request,env,p);
   if(p==="/api"||p.startsWith("/api/"))return json({error:"Not found"},404);
   if(request.method!=="GET")return json({error:"Not found"},404);
   if(p==="/")return page(STATIC["/"]||"<h1>MTI</h1>");
   if(p==="/admin")return page(STATIC["/admin"]||"<h1>MTI Admin</h1>");
   if(p==="/student")return page(STATIC["/student"]||"<h1>MTI Student Portal</h1>");
   return json({error:"Not found"},404);
  }catch(error){
   if(error instanceof SyntaxError)return json({error:"Invalid JSON"},400);
   if(error.message==="Request too large")return json({error:error.message},413);
   console.error("MTI request error",error.name,error.message);
   if(/UNIQUE constraint failed/i.test(error.message))return json({error:"A record with this information already exists."},409);
   if(/FOREIGN KEY constraint/i.test(error.message))return json({error:"An associated record could not be found."},400);
   return json({error:"Unable to complete request."},500);
  }
 }
};
