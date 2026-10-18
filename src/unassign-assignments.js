/* MTI safe assignment correction.
 * An administrator can remove an accidental assignment only while it remains
 * unsubmitted and ungraded. If it was the sole untouched assignment for an
 * active curriculum-year, the mistaken enrollment is removed as well so the
 * lesson will not be automatically re-created.
 */
async function assignmentUnassignPreview(env,id){
 const a=await env.DB.prepare("SELECT a.*,s.full_name AS student_name,l.course_id,l.year,l.lesson_number,c.name AS course_name FROM assignments a JOIN students s ON s.id=a.student_id LEFT JOIN lessons l ON l.id=a.lesson_id LEFT JOIN courses c ON c.id=l.course_id WHERE a.id=?").bind(id).first();
 if(!a)return null;
 const counts=await env.DB.prepare("SELECT (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id=?) submissions,(SELECT COUNT(*) FROM submission_files WHERE assignment_id=?) files,(SELECT COUNT(*) FROM student_session_completions WHERE assignment_id=?) completion,(SELECT COUNT(*) FROM notification_outbox WHERE assignment_id=? AND status='sending') sending")
 .bind(id,id,id,id).first();
 const year=a.course_id?await env.DB.prepare("SELECT year,course_id,status FROM student_year_enrollments WHERE student_id=? AND year=? AND course_id=? AND status='active'").bind(a.student_id,a.year,a.course_id).first():null;
 const legacy=a.course_id?await env.DB.prepare("SELECT student_id FROM student_learning_paths WHERE student_id=? AND year=? AND course_id=?").bind(a.student_id,a.year,a.course_id).first():null;
 const removeEnrollment=!!(year||legacy);
 const progress=removeEnrollment?await env.DB.prepare("SELECT COUNT(*) n FROM student_session_completions WHERE student_id=? AND year=?").bind(a.student_id,a.year).first():{n:0};
 const siblings=removeEnrollment?await env.DB.prepare("SELECT COUNT(*) n FROM assignments a JOIN lessons l ON l.id=a.lesson_id WHERE a.student_id=? AND a.id<>? AND l.year=? AND l.course_id=?").bind(a.student_id,id,a.year,a.course_id).first():{n:0};
 let reason="";
 if(a.status!=="assigned"||a.submitted_at||a.grade_points!==null||a.bonus_points!==null)reason="Submitted and graded assignments cannot be unassigned. Their work and results are protected.";
 else if(counts.submissions||counts.files||counts.completion)reason="This assignment already contains student work or completion credit. It cannot be removed.";
 else if(counts.sending)reason="An email about this assignment is currently being sent. Please try again shortly.";
 else if(removeEnrollment&&progress.n)reason="This student has completed sessions in the active academic year. Use Students → Enroll year to transfer curricula without erasing completed work.";
 else if(removeEnrollment&&siblings.n)reason="Other assignments exist in this curriculum and year. Review those assignments before removing the enrollment.";
 return {id:a.id,title:a.title,student_name:a.student_name,course_name:a.course_name||"",year:a.year||null,lesson_number:a.lesson_number||null,
  allowed:!reason,reason,remove_enrollment:removeEnrollment,year_completions:progress.n||0,
  pending_work:false,assignment:a};
}
async function assignmentUnassignAction(req,env,path){
 const actor=await currentUser(req,env);
 if(!actor||!["owner","admin"].includes(actor.role)||actor.must_change_password)return json({error:"Only an MTI administrator can unassign lessons."},403);
 const parts=path.split("/");
 const id=parts[4];
 if(req.method==="GET"&&parts[5]==="unassign-review"){
  const preview=await assignmentUnassignPreview(env,id);
  if(!preview)return json({error:"Assignment not found"},404);
  const {assignment,...safe}=preview;
  return json(safe);
 }
 if(req.method!=="POST"||parts[5]!=="unassign")return json({error:"Not found"},404);
 if(!originOK(req))return json({error:"Invalid request origin"},403);
 const body=await payload(req);
 if(body.confirm!==true)return json({error:"You must confirm the unassignment."},400);
 const preview=await assignmentUnassignPreview(env,id);
 if(!preview)return json({error:"Assignment already removed"},404);
 if(!preview.allowed)return json({error:preview.reason},409);
 const a=preview.assignment;
 const sql=[
 {sql:"DELETE FROM notification_outbox WHERE assignment_id=? AND status IN ('pending','failed','sent')",params:[id]},
 {sql:"DELETE FROM assignments WHERE id=? AND status='assigned' AND submitted_at IS NULL AND grade_points IS NULL AND bonus_points IS NULL AND NOT EXISTS(SELECT 1 FROM assignment_submissions WHERE assignment_id=?) AND NOT EXISTS(SELECT 1 FROM submission_files WHERE assignment_id=?) AND NOT EXISTS(SELECT 1 FROM student_session_completions WHERE assignment_id=?)",params:[id,id,id,id]}
 ];
 if(preview.remove_enrollment){
  if(a.course_id&&a.year){
   sql.push({sql:"DELETE FROM student_year_enrollments WHERE student_id=? AND course_id=? AND year=? AND status='active' AND NOT EXISTS(SELECT 1 FROM student_session_completions WHERE student_id=? AND year=?) AND NOT EXISTS(SELECT 1 FROM assignments WHERE id=?)",
    params:[a.student_id,a.course_id,a.year,a.student_id,a.year,id]});
   sql.push({sql:"DELETE FROM student_learning_paths WHERE student_id=? AND course_id=? AND year=? AND NOT EXISTS(SELECT 1 FROM assignments WHERE id=?)",
    params:[a.student_id,a.course_id,a.year,id]});
   sql.push({sql:"UPDATE students SET course_id=(SELECT y.course_id FROM student_year_enrollments y WHERE y.student_id=? ORDER BY y.year DESC LIMIT 1),current_year=COALESCE((SELECT MAX(year) FROM student_year_enrollments WHERE student_id=?),1),current_lesson=CASE WHEN (SELECT COUNT(*) FROM student_session_completions WHERE student_id=?)>0 THEN 9 ELSE 1 END WHERE id=? AND NOT EXISTS(SELECT 1 FROM assignments WHERE id=?)",
    params:[a.student_id,a.student_id,a.student_id,a.student_id,id]});
  }
 }
 const beforeMail=await env.DB.prepare("SELECT status,COUNT(*) n FROM notification_outbox WHERE assignment_id=? GROUP BY status").bind(id).all();
 const outcomes=await env.DB.batch(sql.map(x=>env.DB.prepare(x.sql).bind(...x.params)));
 if(!outcomes[1]?.meta?.changes)return json({error:"The assignment has changed since you opened it. Refresh and try again."},409);
 await auditAction(env,actor,"unassign_assignment","assignment",id,
  {title:a.title,student_id:a.student_id,lesson_id:a.lesson_id,status:a.status,course_id:a.course_id,year:a.year,lesson_number:a.lesson_number},
  {removed:true,removed_active_year_enrollment:preview.remove_enrollment,cancelled_notifications:beforeMail.results});
 return json({ok:true,removed_assignment_id:id,removed_active_year_enrollment:preview.remove_enrollment,
  message:preview.remove_enrollment?"Assignment and mistaken year enrollment removed. Previously completed work remains intact.":"Assignment removed. Other enrollments and grades were not changed."});
}
const UNASSIGN_BASE_APP=typeof UNASSIGN_PREV_APP!=="undefined"?UNASSIGN_PREV_APP:null;
export default {
 async fetch(req,env){
  const path=new URL(req.url).pathname.replace(/\/+$/,"");
  if(/^\/api\/admin\/assignments\/[^/]+\/(unassign-review|unassign)$/.test(path)){
   try{return await assignmentUnassignAction(req,env,path)}
   catch(error){console.error("MTI unassign failure",error?.message);return json({error:"Unable to remove this assignment. Please retry or contact the administrator."},500)}
  }
  return UNASSIGN_PREV_APP.fetch(req,env);
 }
};