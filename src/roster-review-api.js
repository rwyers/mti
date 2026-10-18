/* Staff-only MTI student roster staging review.
 No student accounts or invitations are created by staging.
 This module wraps the existing Cloudflare Worker export during build. */
async function rosterReviewAPI(request,env,path) {
 const user=await currentUser(request,env);
 if(!user||!["owner","admin"].includes(user.role))return json({error:"Administrator access required"},403);
 if(request.method==="GET"&&path==="/api/admin/roster-review") {
  const result=await env.DB.prepare("SELECT * FROM student_import_staging ORDER BY source_row").all();
  return json({items:result.results});
 }
 if(!["POST","PATCH"].includes(request.method))return json({error:"Not found"},404);
 if(!originOK(request))return json({error:"Invalid request origin"},403);
 const body=await payload(request),id=string(body.id,100);
 const entry=await env.DB.prepare("SELECT * FROM student_import_staging WHERE id=?").bind(id).first();
 if(!entry)return json({error:"Review row not found"},404);
 if(entry.review_status!=="pending")return json({error:"This row has already been reviewed"},409);
 if(path==="/api/admin/roster-review/skip"&&request.method==="POST"){
  await env.DB.prepare("UPDATE student_import_staging SET review_status='skipped',reviewed_at=CURRENT_TIMESTAMP WHERE id=?").bind(id).run();
  await auditAction(env,user,"skip_import","student_import",id,{source_row:entry.source_row},{status:"skipped"});
  return json({ok:true});
 }
 if(path==="/api/admin/roster-review/edit"&&request.method==="PATCH") {
  const name=string(body.full_name,160),email=string(body.email,190).toLowerCase(),course=string(body.course_name,160);
  const phone=string(body.phone,80),status=string(body.original_status,30),notes=string(body.notes,1000);
  const year=Number(body.current_year||0),lesson=Number(body.current_lesson||0);
  if(name.length<2||(email&&!isEmail(email))||!["Active","Inactive",""].includes(status)||
   !Number.isInteger(year)||year<0||year>5||!Number.isInteger(lesson)||lesson<0||lesson>52)return json({error:"Invalid student details"},400);
  await env.DB.prepare("UPDATE student_import_staging SET full_name=?,email=?,phone=?,course_name=?,current_year=?,current_lesson=?,original_status=?,notes=? WHERE id=?")
  .bind(name,email,phone,course,year||null,lesson||null,status,notes,id).run();
  await auditAction(env,user,"edit_import","student_import",id,
   {name:entry.full_name,email:entry.email,course:entry.course_name,status:entry.original_status},
   {name,email,course,status});
  return json({ok:true});
 }
 if(path==="/api/admin/roster-review/approve"&&request.method==="POST"){
  const email=string(entry.email,190).toLowerCase(),year=Number(entry.current_year),lesson=Number(entry.current_lesson);
  if(entry.original_status!=="Active"||!isEmail(email)||!Number.isInteger(year)||year<1||year>5||
   !Number.isInteger(lesson)||lesson<1||lesson>52)return json({error:"Complete the student's active status, email, year and lesson before approving."},400);
  const course=await env.DB.prepare("SELECT id FROM courses WHERE name=?").bind(entry.course_name).first();
  if(!course)return json({error:"The field of study must match a course in MTI."},400);
  const duplicates=await env.DB.prepare("SELECT COUNT(*) AS n FROM student_import_staging WHERE lower(email)=? AND review_status!='skipped'").bind(email).first();
  if(duplicates.n>1)return json({error:"The email is shared by several source rows. Resolve that before approval."},409);
  const existing=await env.DB.prepare("SELECT id FROM students WHERE lower(email)=?").bind(email).first();
  if(existing)return json({error:"A student with that email already exists."},409);
  const newId=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO students (id,full_name,email,phone,course_id,current_year,current_lesson,status,notes) VALUES (?,?,?,?,?,?,?,'active',?)")
   .bind(newId,entry.full_name,email,entry.phone,course.id,year,lesson,entry.notes).run();
  await env.DB.prepare("UPDATE student_import_staging SET review_status='approved',imported_student_id=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?").bind(newId,id).run();
  await auditAction(env,user,"approve_import","student",newId,null,{source:"MTI Student Database.xlsx",source_row:entry.source_row,full_name:entry.full_name,course:entry.course_name});
  return json({ok:true,student_id:newId},201);
 }
 return json({error:"Not found"},404);
}
export default {
 async fetch(request,env) {
  const p=new URL(request.url).pathname.replace(/\/+$/,"");
  if(p.startsWith("/api/admin/roster-review")) {
   try {return await rosterReviewAPI(request,env,p);}
   catch(e){console.error("roster review error",e.message);return json({error:"Unable to process roster review"},500);}
  }
  return MTI_APP.fetch(request,env);
 }
};
