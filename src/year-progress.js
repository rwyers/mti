/* MTI year-level academic ledger and curriculum switching.
 * One nine-session sequence per student/year, regardless of the curriculum
 * teaching a particular session. Students retain graded submissions when
 * switching between curricula and must buy/receive admin approval for new years.
 */
const MTI_NINE=9;
async function yearProgressRows(env,studentId) {
 const rows=await env.DB.prepare("SELECT y.*,c.name AS course_name FROM student_year_enrollments y JOIN courses c ON c.id=y.course_id WHERE y.student_id=? ORDER BY y.year").bind(studentId).all();
 return rows.results;
}
async function currentYearProgress(env,studentId) {
 const rows=await yearProgressRows(env,studentId);
 return rows.find(r=>r.status==="active")||null;
}
async function completionRows(env,studentId) {
 const r=await env.DB.prepare("SELECT t.student_id,t.year,t.session_number,t.assignment_id,t.course_id,t.grade_points,t.bonus_points,t.completed_at,c.name AS course_name,a.title,a.feedback,a.status FROM student_session_completions t JOIN courses c ON c.id=t.course_id JOIN assignments a ON a.id=t.assignment_id WHERE t.student_id=? ORDER BY t.year,t.session_number").bind(studentId).all();
 return r.results;
}
async function yearCardData(env,studentId) {
 const years=await yearProgressRows(env,studentId),history=await completionRows(env,studentId);
 const current=years.find(y=>y.status==="active")||null;
 const allByKey=new Map(history.map(x=>[x.year+":"+x.session_number,x]));
 const historyYears=years.map(y=>({year:y.year,course_id:y.course_id,course_name:y.course_name,status:y.status,
  approved_at:y.enrolled_at,completed_at:y.completed_at,paid_confirmed:!!y.payment_confirmed,
  completed_count:history.filter(x=>x.year===y.year).length,
  sessions:history.filter(x=>x.year===y.year).map(x=>({number:x.session_number,assignment_id:x.assignment_id,
   course_name:x.course_name,grade_points:x.grade_points,completed_at:x.completed_at,title:x.title}))}));
 if(!current)return {current:null,cards:[],history:historyYears,allowed:[],completions:history};
 const lessons=await env.DB.prepare("SELECT id,course_id,year,lesson_number,credits,memory_verse_reference,memory_verse_text,bible_instruction,assignment_instructions,submission_notes,materials_list FROM lessons WHERE course_id=? AND year=? AND active=1 AND lesson_number BETWEEN 1 AND 9 ORDER BY lesson_number").bind(current.course_id,current.year).all();
 const byNumber=new Map(lessons.results.map(x=>[x.lesson_number,x]));
 const live=await env.DB.prepare("SELECT a.*,l.course_id,l.year,l.lesson_number,l.credits,l.memory_verse_reference,l.memory_verse_text,l.bible_instruction,l.assignment_instructions,l.submission_notes,l.materials_list,c.name AS course_name,s.response_text,s.activity_form_json,s.submitted_at AS response_submitted_at FROM assignments a JOIN lessons l ON a.lesson_id=l.id JOIN courses c ON c.id=l.course_id LEFT JOIN assignment_submissions s ON s.assignment_id=a.id WHERE a.student_id=? AND l.course_id=? AND l.year=? ORDER BY a.created_at DESC,a.id DESC")
 .bind(studentId,current.course_id,current.year).all();
 const liveByNumber=new Map();
 for(const assignment of live.results)if(!liveByNumber.has(assignment.lesson_number))liveByNumber.set(assignment.lesson_number,assignment);
 const cards=[],allowed=[];
 let previousCompleted=true;
 for(let number=1;number<=MTI_NINE;number++){
  const record=allByKey.get(current.year+":"+number),lesson=byNumber.get(number);
  if(record) {
   cards.push({lesson_number:number,status:"graded",locked:false,available:true,completed:true,
    course_name:record.course_name,title:record.title,assignment_id:record.assignment_id,grade_points:record.grade_points});
   previousCompleted=true;
   continue;
  }
  if(!lesson||!previousCompleted){
   cards.push({lesson_number:number,status:lesson?"locked":"unavailable",locked:true,available:!!lesson,completed:false,title:"Lesson "+number});
   previousCompleted=false;continue;
  }
  const a=liveByNumber.get(number);
  cards.push({lesson_number:number,status:a?.status||"available",locked:false,available:true,
   completed:false,assignment_id:a?.id||null,title:a?.title||"Lesson "+number,due_date:a?.due_date||""});
  if(a)allowed.push(a);
  previousCompleted=false;
 }
 // Historic graded work can be viewed by the student but not resubmitted.
 const completedIds=history.map(x=>x.assignment_id);
 const historyAssignments=[];
 for(const entry of history){
  const row=await env.DB.prepare("SELECT a.*,l.course_id,l.year,l.lesson_number,l.credits,l.memory_verse_reference,l.memory_verse_text,l.bible_instruction,l.assignment_instructions,l.submission_notes,l.materials_list,c.name AS course_name,s.response_text,s.activity_form_json,s.submitted_at AS response_submitted_at FROM assignments a JOIN lessons l ON a.lesson_id=l.id JOIN courses c ON c.id=l.course_id LEFT JOIN assignment_submissions s ON s.assignment_id=a.id WHERE a.id=? AND a.student_id=? AND a.status='graded'")
   .bind(entry.assignment_id,studentId).first();
  if(row)historyAssignments.push(row);
 }
 const safeById=new Map([...historyAssignments,...allowed].map(x=>[x.id,x]));
 return {current,cards,history:historyYears,allowed:[...safeById.values()],completions:history};
}
async function materialAccessAllowed(env,studentId,assignmentId) {
 const year=await currentYearProgress(env,studentId);
 if(!year){
  const past=await yearProgressRows(env,studentId);
  if(!past.length)return true; // Original manual assignments for non-enrolled students
  const preserved=await env.DB.prepare("SELECT id FROM assignments WHERE id=? AND student_id=? AND status IN ('submitted','graded')").bind(assignmentId,studentId).first();
  return !!preserved;
 }
 const preserved=await env.DB.prepare("SELECT id FROM assignments WHERE id=? AND student_id=? AND status IN ('submitted','graded')").bind(assignmentId,studentId).first();
 if(preserved)return true;
 const data=await yearCardData(env,studentId);
 return data.allowed.some(x=>x.id===assignmentId);
}
async function historicYearMigration(env,studentId,year){
 // Backfill contiguous previously graded work from the student's actual MTI
 // assignment records, regardless of which curriculum supplied the lesson.
 const grades=await env.DB.prepare("SELECT a.id,a.grade_points,a.bonus_points,l.lesson_number,l.course_id FROM assignments a JOIN lessons l ON l.id=a.lesson_id WHERE a.student_id=? AND a.status='graded' AND l.year=? AND l.lesson_number BETWEEN 1 AND 9 ORDER BY a.updated_at DESC,a.created_at DESC")
  .bind(studentId,year).all();
 const rows=new Map();
 for(const a of grades.results)if(!rows.has(a.lesson_number))rows.set(a.lesson_number,a);
 for(let n=1;n<=9;n++){
  const row=rows.get(n);
  if(!row)break;
  await env.DB.prepare("INSERT OR IGNORE INTO student_session_completions(student_id,year,session_number,assignment_id,course_id,grade_points,bonus_points) VALUES(?,?,?,?,?,?,?)")
  .bind(studentId,year,n,row.id,row.course_id,row.grade_points,row.bonus_points).run();
 }
}
async function markYearCompletedIfReady(env,studentId,year,actor=null){
 const rows=await env.DB.prepare("SELECT session_number FROM student_session_completions WHERE student_id=? AND year=? ORDER BY session_number").bind(studentId,year).all();
 const finished=rows.results.length===9&&rows.results.every((x,i)=>x.session_number===i+1);
 if(!finished)return false;
 const changed=await env.DB.prepare("UPDATE student_year_enrollments SET status='completed',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE student_id=? AND year=? AND status='active'").bind(studentId,year).run();
 if(changed.meta?.changes)await auditAction(env,actor,"complete_year","student",studentId,null,{year,completed_sessions:9});
 return true;
}
async function unlockYearNext(env,studentId,actor=null){
 const year=await currentYearProgress(env,studentId);
 if(!year)return {created:[],year_complete:true};
 const progress=await yearCardData(env,studentId);
 const next=progress.cards.find(x=>!x.completed);
 if(!next)return {created:[],year_complete:await markYearCompletedIfReady(env,studentId,year.year,actor)};
 if(next.locked||!next.available||next.assignment_id)return {created:[],year_complete:false};
 const lesson=await env.DB.prepare("SELECT id FROM lessons WHERE course_id=? AND year=? AND lesson_number=? AND active=1 LIMIT 1").bind(year.course_id,year.year,next.lesson_number).first();
 if(!lesson)return {created:[],year_complete:false};
 const id=crypto.randomUUID(),title=year.course_name+" · Year "+year.year+" · Lesson "+next.lesson_number;
 const result=await env.DB.prepare("INSERT INTO assignments(id,student_id,lesson_id,title,due_date,status) SELECT ?,?,?,?,'','assigned' WHERE NOT EXISTS(SELECT 1 FROM assignments WHERE student_id=? AND lesson_id=?)")
  .bind(id,studentId,lesson.id,title,studentId,lesson.id).run();
 const created=[];
 if(result.meta?.changes){
  created.push({id,title,lesson_number:next.lesson_number});
  await env.DB.prepare("UPDATE students SET current_year=?,current_lesson=? WHERE id=?").bind(year.year,next.lesson_number,studentId).run();
  await auditAction(env,actor,"unlock_lesson","assignment",id,null,{student_id:studentId,year:year.year,session_number:next.lesson_number,course_id:year.course_id});
  if(typeof safeQueueNotice==="function")await safeQueueNotice(()=>queuedStudentUpdate(env,id,"assignment_assigned"));
 }
 return {created,year_complete:false};
}
async function recordGradedSession(env,studentId,assignmentId,actor) {
 const a=await env.DB.prepare("SELECT a.id,a.status,a.grade_points,a.bonus_points,l.year,l.lesson_number,l.course_id FROM assignments a JOIN lessons l ON l.id=a.lesson_id WHERE a.id=? AND a.student_id=?").bind(assignmentId,studentId).first();
 if(!a||a.status!=="graded")return {created:[],recorded:false};
 const year=await currentYearProgress(env,studentId);
 if(!year||a.year!==year.year||a.course_id!==year.course_id)return {created:[],recorded:false};
 const previous=await env.DB.prepare("SELECT 1 FROM student_session_completions WHERE student_id=? AND year=? AND session_number=?").bind(studentId,year.year,a.lesson_number-1).first();
 if(a.lesson_number!==1&&!previous)return {created:[],recorded:false};
 const existing=await env.DB.prepare("SELECT assignment_id FROM student_session_completions WHERE student_id=? AND year=? AND session_number=?").bind(studentId,year.year,a.lesson_number).first();
 if(!existing){
  await env.DB.prepare("INSERT OR IGNORE INTO student_session_completions(student_id,year,session_number,assignment_id,course_id,grade_points,bonus_points) VALUES(?,?,?,?,?,?,?)")
  .bind(studentId,year.year,a.lesson_number,a.id,a.course_id,a.grade_points,a.bonus_points).run();
 }else if(existing.assignment_id===a.id){
  await env.DB.prepare("UPDATE student_session_completions SET grade_points=?,bonus_points=? WHERE student_id=? AND year=? AND session_number=?")
   .bind(a.grade_points,a.bonus_points,studentId,year.year,a.lesson_number).run();
 }
 if(await markYearCompletedIfReady(env,studentId,year.year,actor))return {created:[],recorded:true,year_complete:true};
 const unlocked=await unlockYearNext(env,studentId,actor);
 return {...unlocked,recorded:true};
}
async function yearProgressEnrollment(req,env,actor) {
 if(!originOK(req))return json({error:"Invalid origin"},403);
 const body=await payload(req),studentId=string(body.student_id,100),courseId=string(body.course_id,100),year=Number(body.year);
 if(!studentId||!courseId||!Number.isInteger(year)||year<1||year>5)return json({error:"Choose student, curriculum and year."},400);
 const student=await env.DB.prepare("SELECT * FROM students WHERE id=? AND status='active'").bind(studentId).first();
 const course=await env.DB.prepare("SELECT * FROM courses WHERE id=? AND active=1").bind(courseId).first();
 if(!student||!course)return json({error:"Student or active curriculum not found."},404);
 const check=await env.DB.prepare("SELECT DISTINCT lesson_number FROM lessons WHERE course_id=? AND year=? AND active=1 AND lesson_number BETWEEN 1 AND 9").bind(courseId,year).all();
 if(check.results.length!==9)return json({error:"That curriculum year does not yet have all nine lessons."},409);
 const rows=await yearProgressRows(env,studentId),existing=rows.find(x=>x.year===year),current=rows.find(x=>x.status==="active");
 if(existing&&existing.status==="completed")return json({error:"This year has already been completed and archived."},409);
 if(year>1){
  const prior=rows.find(x=>x.year===year-1);
  if(!prior||prior.status!=="completed")return json({error:"Year "+(year-1)+" must be completed before assigning Year "+year+"."},409);
  if(!existing&&body.payment_confirmed!==true)return json({error:"Confirm the next-year payment before approving this enrollment."},409);
 }
 if(current&&current.year!==year)return json({error:"Finish the currently active year before moving to a new year."},409);
 if(existing&&existing.course_id!==courseId){
  const pending=await env.DB.prepare("SELECT COUNT(*) n FROM assignments a JOIN lessons l ON l.id=a.lesson_id WHERE a.student_id=? AND l.year=? AND a.status='submitted'").bind(studentId,year).first();
  if(pending?.n)return json({error:"Please grade the student's "+pending.n+" submitted assignment(s) in Year "+year+" before switching curricula, so every session receives credit."},409);
 }
 if(existing&&existing.course_id!==courseId&&body.confirm_replace!==true)return json({error:"Confirm this curriculum transfer. Completed sessions and grades will be preserved."},409);
 if(existing&&existing.course_id!==courseId){
  await env.DB.prepare("INSERT INTO student_curriculum_transfers(id,student_id,year,from_course_id,to_course_id,changed_by) VALUES(?,?,?,?,?,?)")
   .bind(crypto.randomUUID(),studentId,year,existing.course_id,courseId,actor.id).run();
 }
 await env.DB.prepare("INSERT INTO student_year_enrollments(student_id,year,course_id,status,payment_confirmed,payment_confirmed_by,approved_by) VALUES(?,?,?,'active',?,?,?) ON CONFLICT(student_id,year) DO UPDATE SET course_id=excluded.course_id,approved_by=excluded.approved_by,updated_at=CURRENT_TIMESTAMP")
 .bind(studentId,year,courseId,year>1?1:0,year>1?actor.id:null,actor.id).run();
 // Upgrade/keep legacy progress already graded, especially for existing students.
 await historicYearMigration(env,studentId,year);
 const graded=await env.DB.prepare("SELECT COUNT(*) n FROM student_session_completions WHERE student_id=? AND year=?").bind(studentId,year).first();
 await env.DB.prepare("UPDATE students SET course_id=?,current_year=?,current_lesson=? WHERE id=?")
 .bind(courseId,year,Math.min(9,(graded?.n||0)+1),studentId).run();
 await auditAction(env,actor,existing?.course_id!==courseId?"transfer_curriculum":"enroll_year","student",studentId,
  existing?{year,course_id:existing.course_id}:null,{year,course_id:courseId,payment_confirmed:year>1,completed_sessions:graded?.n||0});
 if(await markYearCompletedIfReady(env,studentId,year,actor))
  return json({ok:true,student_name:student.full_name,course_name:course.name,year,new_assignments:[],completed_sessions:9,year_completed:true});
 const result=await unlockYearNext(env,studentId,actor);
 return json({ok:true,student_name:student.full_name,course_name:course.name,year,new_assignments:result.created,completed_sessions:graded?.n||0},201);
}
async function yearStudentData(env,user){
 const years=await yearProgressRows(env,user.student_id);
 if(!years.length)return null;
 const data=await yearCardData(env,user.student_id);
 const student=await env.DB.prepare("SELECT s.id,s.full_name,s.email,s.course_id,s.current_year,s.current_lesson,s.status,c.name AS course_name FROM students s LEFT JOIN courses c ON c.id=s.course_id WHERE s.id=?").bind(user.student_id).first();
 // Graded assignment content remains permanently available, including after
 // a curriculum transfer or after the whole year has been archived.
 const completedAssignments=await env.DB.prepare("SELECT a.*,l.course_id,l.year,l.lesson_number,l.credits,l.memory_verse_reference,l.memory_verse_text,l.bible_instruction,l.assignment_instructions,l.submission_notes,l.materials_list,c.name AS course_name,s.response_text,s.activity_form_json,s.submitted_at AS response_submitted_at FROM student_session_completions t JOIN assignments a ON a.id=t.assignment_id JOIN lessons l ON l.id=a.lesson_id JOIN courses c ON c.id=l.course_id LEFT JOIN assignment_submissions s ON s.assignment_id=a.id WHERE t.student_id=? AND a.status='graded' ORDER BY t.year DESC,t.session_number DESC").bind(user.student_id).all();
 // Retain all handed-in and graded work from earlier curricula, even when not
 // credited in the nine-session ledger yet. Keep former submissions read-only.
 const retained=await env.DB.prepare("SELECT a.*,l.course_id,l.year,l.lesson_number,l.credits,l.memory_verse_reference,l.memory_verse_text,l.bible_instruction,l.assignment_instructions,l.submission_notes,l.materials_list,c.name AS course_name,s.response_text,s.activity_form_json,s.submitted_at AS response_submitted_at FROM assignments a LEFT JOIN lessons l ON l.id=a.lesson_id LEFT JOIN courses c ON c.id=l.course_id LEFT JOIN assignment_submissions s ON s.assignment_id=a.id WHERE a.student_id=? AND a.status IN ('submitted','graded') ORDER BY COALESCE(a.submitted_at,a.updated_at) DESC,a.created_at DESC").bind(user.student_id).all();
 const historic=retained.results.map(a=>({...a,read_only:a.status==="graded"||!data.current||a.course_id!==data.current.course_id||a.year!==data.current.year}));
 const visible=new Map([...completedAssignments.results.map(a=>({...a,read_only:true})),...historic,...data.allowed].map(a=>[a.id,a]));
 const allowed=new Set([...visible.keys()]);
 const files=await env.DB.prepare("SELECT id,assignment_id,filename,content_type,size_bytes,created_at FROM submission_files WHERE student_id=? ORDER BY created_at DESC").bind(user.student_id).all();
 return {student,assignments:[...visible.values()],files:files.results.filter(f=>allowed.has(f.assignment_id)),
  learning_path:{course_id:data.current?.course_id||null,course_name:data.current?.course_name||"",
   year:data.current?.year||null,year_completed:!data.current,cards:data.cards,history:data.history,
   next_year_requires_payment:true,
   previous_submissions:historic.filter(a=>a.read_only&&a.status==="submitted").map(a=>({
    assignment_id:a.id,title:a.title,course_name:a.course_name||"Previous curriculum",year:a.year,lesson_number:a.lesson_number,status:a.status,submitted_at:a.submitted_at
   }))}};
}
async function yearFileGuard(env,studentId,p,method){
 const upload=p.match(/^\/api\/student\/assignments\/([^/]+)\/(files|submit)$/);
 const file=p.match(/^\/api\/student\/files\/([^/]+)$/);
 let assignmentId=upload?.[1];
 if(file){
  const info=await env.DB.prepare("SELECT assignment_id FROM submission_files WHERE id=? AND student_id=?").bind(file[1],studentId).first();
  if(!info)return json({error:"File not found."},404);
  assignmentId=info.assignment_id;
 }
 if(!assignmentId)return null;
 const old=await env.DB.prepare("SELECT a.status,l.course_id,l.year FROM assignments a LEFT JOIN lessons l ON l.id=a.lesson_id WHERE a.id=? AND a.student_id=?").bind(assignmentId,studentId).first();
 const current=await currentYearProgress(env,studentId);
 const historic=!current||old?.course_id!==current.course_id||old?.year!==current.year;
 if(historic && (upload || (file&&method==="DELETE")))
  return json({error:"Previously submitted work is preserved for viewing and downloading, but cannot be changed after switching curricula."},409);
 const allowed=await materialAccessAllowed(env,studentId,assignmentId);
 if(!allowed)return json({error:"This lesson is locked or belongs to a different curriculum. Completed graded work remains available in your history."},403);
 if(upload){
  const completed=await env.DB.prepare("SELECT 1 FROM student_session_completions WHERE student_id=? AND assignment_id=?").bind(studentId,assignmentId).first();
  if(completed)return json({error:"Completed work cannot be changed. Contact your instructor."},409);
 }
 return null;
}
export default {
 async fetch(req,env){
  const p=new URL(req.url).pathname.replace(/\/+$/,"")||"/";
  try {
   if(p==="/api/admin/learning-paths"&&req.method==="GET"){
    const user=await currentUser(req,env);
    if(!user||user.role==="student")return json({error:"Unauthorized"},401);
    const r=await env.DB.prepare("SELECT y.student_id,y.course_id,y.year,y.status,y.payment_confirmed,y.enrolled_at,y.completed_at,c.name AS course_name FROM student_year_enrollments y JOIN courses c ON c.id=y.course_id ORDER BY y.year DESC,y.enrolled_at DESC").all();
    return json({enrollments:r.results});
   }
   if(p==="/api/admin/learning-paths/progress"&&req.method==="GET"){
    const user=await currentUser(req,env);
    if(!user||user.role==="student")return json({error:"Unauthorized"},401);
    const studentId=string(new URL(req.url).searchParams.get("student_id"),100);
    if(!studentId)return json({error:"Choose a student."},400);
    const years=await yearCardData(env,studentId);
    return json({history:years.history,current:years.current,cards:years.cards});
   }
   if(p==="/api/admin/learning-paths/enroll"&&req.method==="POST"){
    const user=await currentUser(req,env);
    if(!user||!["owner","admin"].includes(user.role)||user.must_change_password)return json({error:"Only an administrator may approve or change a paid-year enrollment."},403);
    return yearProgressEnrollment(req,env,user);
   }
   if(p==="/api/student/data"&&req.method==="GET"){
    const user=await currentUser(req,env);
    if(!user||user.role!=="student"||!user.student_id)return json({error:"Please sign in."},401);
    const data=await yearStudentData(env,user);
    if(data)return json(data);
   }
   if(p.startsWith("/api/student/assignments/")||p.startsWith("/api/student/files/")){
    const user=await currentUser(req,env);
    if(!user||user.role!=="student"||!user.student_id)return json({error:"Please sign in."},401);
    if((await yearProgressRows(env,user.student_id)).length){
     const fail=await yearFileGuard(env,user.student_id,p,req.method);
     if(fail)return fail;
     // Bypass legacy current-curriculum filtering; verified above against
     // permanent completion and current unlocked session entitlements.
     const response=await ROSTER_APP.fetch(req,env);
     if(p.endsWith("/submit")&&response.ok&&typeof safeQueueNotice==="function")
      await safeQueueNotice(()=>queuedAdminSubmission(env,p.split("/")[4]));
     return response;
    }
   }
   const grade=p.match(/^\/api\/admin\/assignments\/([^/]+)$/);
   if(grade&&req.method==="PATCH"){
    const user=await currentUser(req,env);
    const prev=user?await env.DB.prepare("SELECT a.status,a.student_id,a.lesson_id,l.course_id,l.year,l.lesson_number FROM assignments a LEFT JOIN lessons l ON l.id=a.lesson_id WHERE a.id=?").bind(grade[1]).first():null;
    const enrolled=prev?await currentYearProgress(env,prev.student_id):null;
    if(enrolled&&prev.year===enrolled.year&&prev.course_id===enrolled.course_id) {
     const body=await req.clone().json().catch(()=>null);
     if(body?.status==="graded"&&prev.status==="assigned")
      return json({error:"The student must submit this session before a teacher can approve it."},409);
     const response=await ROSTER_APP.fetch(req,env);
     if(!response.ok)return response;
     let unlocked=[],yearComplete=false;
     if(body?.status==="graded"){
      const outcome=await recordGradedSession(env,prev.student_id,grade[1],user);
      unlocked=outcome.created||[];yearComplete=!!outcome.year_complete;
      if(typeof safeQueueNotice==="function")
       await safeQueueNotice(()=>queuedStudentUpdate(env,grade[1],prev.status==="graded"?"grade_corrected":"assignment_graded"));
     }
     const bodyResult=await response.json();
     return json({...bodyResult,next_unlocked:unlocked.map(x=>({lesson_number:x.lesson_number,title:x.title})),year_complete:yearComplete},response.status);
    }
   }
   // Corrections to previously completed sessions always remain reflected in
   // the permanent grade history, even after a transfer or year completion.
   const priorGrade=p.match(/^\/api\/admin\/assignments\/([^/]+)$/);
   if(priorGrade&&req.method==="PATCH"){
    const old=await env.DB.prepare("SELECT t.student_id,t.year,t.session_number FROM student_session_completions t WHERE t.assignment_id=?").bind(priorGrade[1]).first();
    if(old){
     const reply=await ROSTER_APP.fetch(req,env);
     if(!reply.ok)return reply;
     const row=await env.DB.prepare("SELECT status,grade_points,bonus_points FROM assignments WHERE id=?").bind(priorGrade[1]).first();
     if(row?.status==="graded"){
      await env.DB.prepare("UPDATE student_session_completions SET grade_points=?,bonus_points=? WHERE assignment_id=?").bind(row.grade_points,row.bonus_points,priorGrade[1]).run();
      if(typeof safeQueueNotice==="function")await safeQueueNotice(()=>queuedStudentUpdate(env,priorGrade[1],"grade_corrected"));
     }
     return reply;
    }
   }
   if(p==="/api/admin/assignments"&&req.method==="POST"){
    const payloadBody=await req.clone().json().catch(()=>null);
    if(payloadBody?.student_id&&(await yearProgressRows(env,string(payloadBody.student_id,100))).length)
     return json({error:"This student follows the nine-session year pathway. New sessions unlock after grading; use Students → Enroll year to switch curricula."},409);
   }
   return YEAR_LEGACY_APP.fetch(req,env);
  }catch(error){
   console.error("MTI year-level progress error:",error?.message);
   return json({error:"Unable to complete the year progress request."},500);
  }
 }
};