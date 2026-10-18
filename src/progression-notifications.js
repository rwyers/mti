/* MTI course progression and durable event-driven email notifications.
   No credentials or student records are stored in this public module.
   Email delivery uses a verified sender and secret in Cloudflare Workers. */
const MTI_PORTAL_URL="https://mti.greatchurch.ca";
function nextLessonTitle(course,lesson) {
 return course+" · Year "+lesson.year+" · Lesson "+lesson.lesson_number;
}
async function nextLessonPreview(env,assignmentId) {
 const a=await env.DB.prepare("SELECT a.id,a.student_id,a.lesson_id,a.status,a.title,s.full_name AS student_name,s.email AS student_email,l.course_id,l.year,l.lesson_number,c.name AS course_name FROM assignments a JOIN students s ON s.id=a.student_id LEFT JOIN lessons l ON l.id=a.lesson_id LEFT JOIN courses c ON c.id=l.course_id WHERE a.id=?").bind(assignmentId).first();
 if(!a)return {error:"Assignment not found",status:404};
 if(a.status!=="graded")return {error:"Grade and save this assignment before moving to the next lesson.",status:409};
 if(!a.course_id||!a.year||!a.lesson_number)return {student_name:a.student_name,current_title:a.title,next:null,reason:"This is a custom assignment not linked to a curriculum lesson."};
 let next=await env.DB.prepare("SELECT * FROM lessons WHERE course_id=? AND year=? AND lesson_number=? AND active=1 ORDER BY created_at,id LIMIT 1")
  .bind(a.course_id,a.year,a.lesson_number+1).first();
 if(!next)next=await env.DB.prepare("SELECT * FROM lessons WHERE course_id=? AND year=? AND lesson_number=1 AND active=1 ORDER BY created_at,id LIMIT 1")
  .bind(a.course_id,a.year+1).first();
 if(!next)return {student_id:a.student_id,student_name:a.student_name,current_title:a.title,next:null,reason:"There is no consecutive lesson in this course. Please check the curriculum."};
 const duplicate=await env.DB.prepare("SELECT id,title,status FROM assignments WHERE student_id=? AND lesson_id=? LIMIT 1").bind(a.student_id,next.id).first();
 return {student_id:a.student_id,student_name:a.student_name,student_email:a.student_email,course_name:a.course_name,current_title:a.title,
  current:{year:a.year,lesson_number:a.lesson_number},next:{id:next.id,year:next.year,lesson_number:next.lesson_number,credits:next.credits,
  memory_verse_reference:next.memory_verse_reference,memory_verse_text:next.memory_verse_text,
  bible_instruction:next.bible_instruction,assignment_instructions:next.assignment_instructions,
  submission_notes:next.submission_notes,materials_list:next.materials_list,title:nextLessonTitle(a.course_name,next)},
  already_assigned:duplicate||null};
}
function emailSendingEnabled(env){return Boolean(env.MTI_EMAIL_DELIVERY_ENABLED==="true" && env.MTI_EMAIL_FROM && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.MTI_EMAIL_FROM) && (env.MTI_MAIL_RELAY_TOKEN || typeof env.EMAIL?.send==="function" || env.RESEND_API_KEY));}
async function queueEmail(env,eventType,recipientRole,recipientEmail,assignmentId,studentId,subject,bodyText) {
 if(!recipientEmail||!isEmail(recipientEmail))return null;
 const id=crypto.randomUUID();
 await env.DB.prepare("INSERT INTO notification_outbox(id,event_key,event_type,recipient_email,recipient_role,student_id,assignment_id,subject,body_text) VALUES(?,?,?,?,?,?,?,?,?)")
  .bind(id,crypto.randomUUID(),eventType,recipientEmail.toLowerCase(),recipientRole,studentId,assignmentId,
   subject.slice(0,180),bodyText.slice(0,3500)).run();
 return id;
}
async function sendPendingEmails(env,onlyIds=null) {
 if(!emailSendingEnabled(env)||env.MTI_EMAIL_DELIVERY_ENABLED!=="true")return {configured:false,sent:0};
 const rows=await env.DB.prepare("SELECT * FROM notification_outbox WHERE status IN ('pending','failed') ORDER BY created_at ASC LIMIT 12").all();
 const ready=onlyIds?rows.results.filter(row=>onlyIds.includes(row.id)):rows.results;
 let sent=0,failed=0;
 for(const mail of ready) {
  const locked=await env.DB.prepare("UPDATE notification_outbox SET status='sending',attempts=attempts+1,last_error=NULL WHERE id=? AND status IN ('pending','failed')").bind(mail.id).run();
  if(!locked.meta?.changes)continue;
  try {
   if(env.MTI_MAIL_RELAY_TOKEN){
    const response=await fetch("https://greatchurch.ca/api/mti/email/send",{
     method:"POST",
     headers:{"Authorization":"Bearer "+env.MTI_MAIL_RELAY_TOKEN,"Content-Type":"application/json"},
     body:JSON.stringify({to:mail.recipient_email,subject:mail.subject,text:mail.body_text})
    });
    if(!response.ok)throw new Error("Church email relay rejected message (HTTP "+response.status+")");
   }else if(typeof env.EMAIL?.send==="function"){
    await env.EMAIL.send({from:env.MTI_EMAIL_FROM,to:mail.recipient_email,subject:mail.subject,text:mail.body_text});
   }else{
    const response=await fetch("https://api.resend.com/emails",{
     method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":mail.event_key},
     body:JSON.stringify({from:env.MTI_EMAIL_FROM,to:[mail.recipient_email],subject:mail.subject,text:mail.body_text})
    });
    if(!response.ok){
     const info=await response.text();
     throw new Error("Email provider HTTP "+response.status+": "+info.slice(0,280));
    }
   }
   await env.DB.prepare("UPDATE notification_outbox SET status='sent',sent_at=CURRENT_TIMESTAMP,last_error=NULL WHERE id=?").bind(mail.id).run();
   sent++;
  }catch(error){
   failed++;
   await env.DB.prepare("UPDATE notification_outbox SET status='failed',last_error=? WHERE id=?")
    .bind(String(error?.message||"Email provider error").slice(0,450),mail.id).run();
   console.warn("MTI notification delivery failed:",mail.id,error?.message);
  }
 }
 return {configured:true,sent,failed};
}
async function queuedStudentUpdate(env,assignmentId,type) {
 const a=await env.DB.prepare("SELECT a.title,a.grade_points,a.student_id,s.full_name,s.email FROM assignments a JOIN students s ON s.id=a.student_id WHERE a.id=?").bind(assignmentId).first();
 if(!a)return;
 const details={
  assignment_assigned:["New MTI assignment: "+a.title,"An MTI instructor has assigned a new lesson to you."],
  assignment_graded:["MTI assignment graded: "+a.title,"Your instructor has graded your assignment."],
  grade_corrected:["MTI assignment updated: "+a.title,"Your instructor has corrected or updated your assignment grade or feedback."]
 }[type];
 if(!details)return;
 const body="Hello "+a.full_name+",\n\n"+details[1]+"\n\nAssignment: "+a.title+
 "\nSign in to view the details: "+MTI_PORTAL_URL+"/student\n\nMinistry Training Institute";
 const id=await queueEmail(env,type,"student",a.email,assignmentId,a.student_id,details[0],body);
 if(id)await sendPendingEmails(env,[id]);
}
async function queuedAdminSubmission(env,assignmentId) {
 const a=await env.DB.prepare("SELECT a.title,a.student_id,s.full_name FROM assignments a JOIN students s ON s.id=a.student_id WHERE a.id=?").bind(assignmentId).first();
 if(!a)return;
 const admins=await env.DB.prepare("SELECT email FROM user_accounts WHERE role IN ('owner','admin') AND active=1 AND email LIKE '%@%'").all();
 const ids=[];
 for(const admin of admins.results){
  const id=await queueEmail(env,"submission_received","admin",admin.email,assignmentId,a.student_id,
   "MTI assignment submitted: "+a.title,
   "A student has handed in an assignment.\n\nStudent: "+a.full_name+"\nAssignment: "+a.title+
   "\n\nSign in to review and grade: "+MTI_PORTAL_URL+"/admin\n\nMinistry Training Institute");
  if(id)ids.push(id);
 }
 if(ids.length)await sendPendingEmails(env,ids);
}
async function safeQueueNotice(fn) {
 try{await fn()}catch(error){console.error("MTI notification could not be queued:",error?.message)}
}
async function assignConfirmedNextLesson(req,env,sourceId,actor,body){
 if(body.confirmed!==true)return json({error:"Review and confirm the lesson details before assigning."},400);
 const preview=await nextLessonPreview(env,sourceId);
 if(preview.error)return json({error:preview.error},preview.status||400);
 if(!preview.next)return json({error:preview.reason||"No next lesson is available."},409);
 if(preview.next.id!==string(body.lesson_id,80))return json({error:"Curriculum has changed; refresh the lesson preview."},409);
 if(preview.already_assigned)return json({error:"This lesson is already assigned to the student."},409);
 const date=string(body.due_date,20);
 if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({error:"Choose a valid due date."},400);
 const title=string(body.title,220)||preview.next.title;
 if(title.length<3)return json({error:"Assignment title is required."},400);
 const id=crypto.randomUUID();
 const created=await env.DB.prepare("INSERT INTO assignments(id,student_id,lesson_id,title,due_date,status) SELECT ?,?,?,?,?, 'assigned' WHERE NOT EXISTS(SELECT 1 FROM assignments WHERE student_id=? AND lesson_id=?)")
  .bind(id,preview.student_id,preview.next.id,title,date,preview.student_id,preview.next.id).run();
 if(!created.meta?.changes)return json({error:"The next lesson was already assigned; no duplicate was created."},409);
 await env.DB.prepare("UPDATE students SET current_year=?,current_lesson=? WHERE id=? AND (current_year<? OR (current_year=? AND current_lesson<?))")
  .bind(preview.next.year,preview.next.lesson_number,preview.student_id,preview.next.year,preview.next.year,preview.next.lesson_number).run();
 await auditAction(env,actor,"assign_next_lesson","assignment",id,null,{
  from_assignment:sourceId,student_id:preview.student_id,lesson_id:preview.next.id,
  year:preview.next.year,lesson_number:preview.next.lesson_number,due_date:date,title
 });
 await safeQueueNotice(()=>queuedStudentUpdate(env,id,"assignment_assigned"));
 return json({ok:true,id,title,student_name:preview.student_name,lesson:preview.next},201);
}
