/* MTI nine-lesson learning paths.
   Lessons 1-9 appear on the student dashboard. Materials and submission endpoints
   are server protected until the previous lesson is graded by an instructor.
   Existing manually assigned classes remain unchanged unless a student is
   deliberately enrolled in an annual learning path. */
const PATH_LESSONS=9;
async function getLearningPath(env,studentId){
 return env.DB.prepare("SELECT p.student_id,p.course_id,p.year,c.name AS course_name FROM student_learning_paths p JOIN courses c ON c.id=p.course_id WHERE p.student_id=?").bind(studentId).first();
}
async function getPathRows(env,studentId){
 const path=await getLearningPath(env,studentId);
 if(!path)return null;
 const lessons=await env.DB.prepare("SELECT id,course_id,year,lesson_number,credits,memory_verse_reference,memory_verse_text,bible_instruction,assignment_instructions,submission_notes,materials_list FROM lessons WHERE course_id=? AND year=? AND active=1 AND lesson_number BETWEEN 1 AND 9 ORDER BY lesson_number").bind(path.course_id,path.year).all();
 const assignments=await env.DB.prepare("SELECT a.*,l.course_id,l.year,l.lesson_number,l.credits,l.memory_verse_reference,l.memory_verse_text,l.bible_instruction,l.assignment_instructions,l.submission_notes,l.materials_list,c.name AS course_name,s.response_text,s.submitted_at AS response_submitted_at FROM assignments a JOIN lessons l ON l.id=a.lesson_id JOIN courses c ON c.id=l.course_id LEFT JOIN assignment_submissions s ON s.assignment_id=a.id WHERE a.student_id=? AND l.course_id=? AND l.year=? AND l.lesson_number BETWEEN 1 AND 9 ORDER BY a.created_at DESC,a.id DESC").bind(studentId,path.course_id,path.year).all();
 const byLesson=new Map();
 for(const a of assignments.results)if(!byLesson.has(a.lesson_number))byLesson.set(a.lesson_number,a);
 const byNumber=new Map(lessons.results.map(l=>[l.lesson_number,l]));
 let previousGraded=true;
 const cards=[];
 for(let number=1;number<=PATH_LESSONS;number++){
  const lesson=byNumber.get(number),assignment=byLesson.get(number);
  const unlocked=Boolean(lesson&&previousGraded);
  cards.push({
   lesson_number:number,locked:!unlocked,available:!!lesson,
   title:unlocked&&assignment?assignment.title:"Lesson "+number,
   status:!lesson?"unavailable":unlocked?(assignment?.status||"available"):"locked",
   assignment_id:unlocked?(assignment?.id||null):null,
   grade_points:unlocked&&assignment?.status==="graded"?assignment.grade_points:null,
   due_date:unlocked?(assignment?.due_date||""):""
  });
  if(!lesson||assignment?.status!=="graded")previousGraded=false;
 }
 const allowed=assignments.results.filter(a=>cards[a.lesson_number-1]?.assignment_id===a.id);
 return {path,lessons:lessons.results,cards,allowed,byLesson};
}
async function ensureNextOpenAssignment(env,studentId,actor=null){
 const progress=await getPathRows(env,studentId);
 if(!progress)return {created:[],progress:null};
 const created=[];
 for(let number=1;number<=9;number++){
  const card=progress.cards[number-1];
  if(card.locked||!card.available)break;
  if(progress.byLesson.get(number))continue;
  const lesson=progress.lessons.find(l=>l.lesson_number===number);
  if(!lesson)break;
  const id=crypto.randomUUID();
  const title=progress.path.course_name+" · Year "+progress.path.year+" · Lesson "+number;
  const run=await env.DB.prepare("INSERT INTO assignments(id,student_id,lesson_id,title,due_date,status) SELECT ?,?,?,?,'','assigned' WHERE NOT EXISTS(SELECT 1 FROM assignments WHERE student_id=? AND lesson_id=?)")
   .bind(id,studentId,lesson.id,title,studentId,lesson.id).run();
  if(run.meta?.changes) {
   created.push({id,title,lesson_number:number,student_id:studentId});
   await auditAction(env,actor,"unlock_lesson","assignment",id,null,{student_id:studentId,course_id:progress.path.course_id,year:progress.path.year,lesson_number:number});
  }
 }
 // New assignments are notified individually, while any failure to send email
 // must never prevent a student from continuing their lessons.
 for(const item of created) {
  if(typeof safeQueueNotice==="function"&&typeof queuedStudentUpdate==="function")
   await safeQueueNotice(()=>queuedStudentUpdate(env,item.id,"assignment_assigned"));
 }
 return {created,progress:await getPathRows(env,studentId)};
}
async function isAllowedLearningAssignment(env,studentId,assignmentId){
 const path=await getLearningPath(env,studentId);
 if(!path)return true;
 const progress=await getPathRows(env,studentId);
 return progress.allowed.some(a=>a.id===assignmentId);
}
async function learningPathAPI(req,env,path){
 const actor=await currentUser(req,env);
 if(!actor||actor.role==="student"||actor.must_change_password)return json({error:"Administrator access required"},401);
 if(path==="/api/admin/learning-paths"&&req.method==="GET"){
  const r=await env.DB.prepare("SELECT p.student_id,p.course_id,p.year,p.enrolled_at,c.name AS course_name FROM student_learning_paths p JOIN courses c ON c.id=p.course_id ORDER BY p.enrolled_at DESC").all();
  return json({enrollments:r.results});
 }
 if(path==="/api/admin/learning-paths/enroll"&&req.method==="POST"){
  if(!originOK(req))return json({error:"Invalid origin"},403);
  const body=await payload(req),studentId=string(body.student_id,100),courseId=string(body.course_id,100),year=Number(body.year);
  if(!studentId||!courseId||!Number.isInteger(year)||year<1||year>5)return json({error:"Choose a student, curriculum and year."},400);
  const student=await env.DB.prepare("SELECT * FROM students WHERE id=?").bind(studentId).first();
  if(!student)return json({error:"Student not found"},404);
  if(student.status!=="active")return json({error:"The student must be active before enrollment."},409);
  const course=await env.DB.prepare("SELECT * FROM courses WHERE id=? AND active=1").bind(courseId).first();
  if(!course)return json({error:"Course unavailable"},404);
  const lessonNums=await env.DB.prepare("SELECT DISTINCT lesson_number FROM lessons WHERE course_id=? AND year=? AND active=1 AND lesson_number BETWEEN 1 AND 9").bind(courseId,year).all();
  if(lessonNums.results.length!==9||lessonNums.results.some(x=>x.lesson_number<1||x.lesson_number>9))
   return json({error:"This curriculum year is incomplete. All nine lessons must exist before enrollment."},409);
  const before=await getLearningPath(env,studentId);
  if(before&&before.course_id===courseId&&before.year===year){
   const result=await ensureNextOpenAssignment(env,studentId,actor);
   return json({ok:true,already_enrolled:true,student_name:student.full_name,course_name:course.name,year,new_assignments:result.created});
  }
  if(before&&body.confirm_replace!==true)return json({error:"The student is already enrolled in a learning path. Confirm the replacement first."},409);
  await env.DB.prepare("INSERT INTO student_learning_paths(student_id,course_id,year,enrolled_by) VALUES(?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET course_id=excluded.course_id,year=excluded.year,enrolled_by=excluded.enrolled_by,updated_at=CURRENT_TIMESTAMP")
   .bind(studentId,courseId,year,actor.id).run();
  await env.DB.prepare("UPDATE students SET course_id=?,current_year=?,current_lesson=1 WHERE id=?").bind(courseId,year,studentId).run();
  await auditAction(env,actor,"enroll_learning_path","student",studentId,before,{course_id:courseId,year});
  const result=await ensureNextOpenAssignment(env,studentId,actor);
  return json({ok:true,student_name:student.full_name,course_name:course.name,year,new_assignments:result.created},201);
 }
 return json({error:"Not found"},404);
}
async function pathStudentData(env,user){
 const progress=await getPathRows(env,user.student_id);
 if(!progress)return null;
 const student=await env.DB.prepare("SELECT s.id,s.full_name,s.email,s.course_id,s.current_year,s.current_lesson,s.status,c.name AS course_name FROM students s LEFT JOIN courses c ON c.id=s.course_id WHERE s.id=?").bind(user.student_id).first();
 const allowedIds=progress.allowed.map(a=>a.id);
 const allFiles=await env.DB.prepare("SELECT id,assignment_id,filename,content_type,size_bytes,created_at FROM submission_files WHERE student_id=? ORDER BY created_at DESC").bind(user.student_id).all();
 const allowedSet=new Set(allowedIds);
 return {student,assignments:progress.allowed,files:allFiles.results.filter(x=>allowedSet.has(x.assignment_id)),
  learning_path:{course_id:progress.path.course_id,course_name:progress.path.course_name,year:progress.path.year,cards:progress.cards}};
}
async function denyLockedStudentResource(req,env,p,user){
 const match=p.match(/^\/api\/student\/assignments\/([^/]+)\/(submit|files)$/);
 if(match){
  const allowed=await isAllowedLearningAssignment(env,user.student_id,match[1]);
  return allowed?null:json({error:"This lesson is locked until the previous lesson is graded."},403);
 }
 const file=p.match(/^\/api\/student\/files\/([^/]+)$/);
 if(file){
  const row=await env.DB.prepare("SELECT assignment_id FROM submission_files WHERE id=? AND student_id=?").bind(file[1],user.student_id).first();
  if(!row)return json({error:"File not found"},404);
  const allowed=await isAllowedLearningAssignment(env,user.student_id,row.assignment_id);
  return allowed?null:json({error:"This lesson is locked."},403);
 }
 return null;
}
export default {
 async fetch(request,env){
  const p=new URL(request.url).pathname.replace(/\/+$/,"")||"/";
  try{
   if(p.startsWith("/api/admin/learning-paths"))return learningPathAPI(request,env,p);
   if(p==="/api/student/data"&&request.method==="GET"){
    const user=await currentUser(request,env);
    if(!user||user.role!=="student"||!user.student_id)return json({error:"Please sign in."},401);
    const result=await pathStudentData(env,user);
    if(result)return json(result);
   }
   if(p.startsWith("/api/student/assignments/")||p.startsWith("/api/student/files/")){
    const u=await currentUser(request,env);
    if(!u||u.role!=="student"||!u.student_id)return json({error:"Please sign in."},401);
    const denied=await denyLockedStudentResource(request,env,p,u);
    if(denied)return denied;
   }
   // Assignment grading triggers the next lesson automatically. A correction
   // to an already graded assignment cannot produce a duplicate.
   const gradeMatch=p.match(/^\/api\/admin\/assignments\/([^/]+)$/);
   if(gradeMatch&&request.method==="PATCH"){
    const actor=await currentUser(request,env);
    const requestBody=await request.clone().json().catch(()=>null);
    const before=actor?await env.DB.prepare("SELECT status FROM assignments WHERE id=?").bind(gradeMatch[1]).first():null;
    const response=await ROSTER_APP.fetch(request,env);
    if(!response.ok||!actor||!before)return response;
    let unlocked=[];
    if(requestBody?.status==="graded"&&before.status!=="graded"){
     const row=await env.DB.prepare("SELECT student_id FROM assignments WHERE id=?").bind(gradeMatch[1]).first();
     if(row){
      try{
       const result=await ensureNextOpenAssignment(env,row.student_id,actor);
       unlocked=result.created;
       if(unlocked.length)await env.DB.prepare("UPDATE students SET current_lesson=? WHERE id=? AND current_lesson<?")
        .bind(unlocked[unlocked.length-1].lesson_number,row.student_id,unlocked[unlocked.length-1].lesson_number).run();
      }catch(e){console.error("MTI auto-unlock failed",e.message)}
     }
    }
    if(requestBody?.status==="graded"&&typeof safeQueueNotice==="function")
     await safeQueueNotice(()=>queuedStudentUpdate(env,gradeMatch[1],before.status==="graded"?"grade_corrected":"assignment_graded"));
    const output=await response.json();
    return json({...output,next_unlocked:unlocked.map(x=>({lesson_number:x.lesson_number,title:x.title}))},response.status);
   }
   const manualAssign=p==="/api/admin/assignments"&&request.method==="POST";
   if(manualAssign){
    const requestBody=await request.clone().json().catch(()=>null);
    const studentId=string(requestBody?.student_id,100);
    if(studentId&&await getLearningPath(env,studentId))
     return json({error:"This student uses the nine-lesson pathway. Lessons unlock automatically after grading; manage their curriculum and year under Students → Enroll pathway."},409);
    const response=await ROSTER_APP.fetch(request,env);
    if(response.ok&&typeof safeQueueNotice==="function"){
     const data=await response.clone().json();
     if(data.id)await safeQueueNotice(()=>queuedStudentUpdate(env,data.id,"assignment_assigned"));
    }
    return response;
   }
   const submit=/^\/api\/student\/assignments\/([^/]+)\/submit$/.exec(p);
   if(submit&&request.method==="POST"){
    const response=await ROSTER_APP.fetch(request,env);
    if(response.ok&&typeof safeQueueNotice==="function")
     await safeQueueNotice(()=>queuedAdminSubmission(env,submit[1]));
    return response;
   }
   return ROSTER_APP.fetch(request,env);
  }catch(e){
   console.error("MTI learning pathway error",e?.message);
   return json({error:"Unable to complete the learning path request."},500);
  }
 }
};