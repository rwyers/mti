/* Nine-lesson enrollment controls and email delivery status for MTI administration. */
var ACTIVE_LEARNING_PATHS=new Map();
function completeCurriculumYears(){
 const entries=[];
 for(const course of DATA.courses.filter(c=>c.active)){
  for(let year=1;year<=5;year++){
   const found=new Set(DATA.lessons.filter(l=>l.active&&l.course_id===course.id&&Number(l.year)===year&&Number(l.lesson_number)>=1&&Number(l.lesson_number)<=9).map(l=>Number(l.lesson_number)));
   if(found.size===9&&Array.from({length:9},(_,n)=>n+1).every(n=>found.has(n)))entries.push({course_id:course.id,course_name:course.name,year});
  }
 }
 return entries;
}
function addPathButtons(){
 const table=el("studentTable")?.querySelector("table");
 if(!table)return;
 const filter=(el("studentSearch")?.value||"").toLowerCase();
 const students=DATA.students.filter(s=>[s.full_name,s.email,s.phone].join(" ").toLowerCase().includes(filter));
 table.querySelectorAll("tbody tr").forEach((row,index)=>{
  const student=students[index];if(!student)return;
  const cell=row.querySelector("td:last-child");
  if(!cell||cell.querySelector("[data-path-student]"))return;
  const b=document.createElement("button");b.type="button";b.className="soft";
  b.dataset.pathStudent=student.id;b.textContent="Enroll year";b.style.marginLeft="6px";
  b.addEventListener("click",()=>openPathEnrollment(student.id));
  cell.appendChild(b);
 });
}
const existingPathRender=render;
render=function(){existingPathRender();addPathButtons()};
async function openPathEnrollment(studentId){
 const student=DATA.students.find(x=>x.id===studentId);if(!student)return;
 await loadPathEnrollments();
 const eligible=completeCurriculumYears();
 const selected=ACTIVE_LEARNING_PATHS.get(studentId);
 el("modalTitle").textContent="Enroll student in curriculum + year";
 el("formError").textContent="";
 if(!eligible.length){
  el("modalBody").innerHTML="<p>There are no complete nine-lesson curriculum years. Complete the missing lessons first.</p>"+buttons("Close");
  el("overlay").classList.remove("hidden");
  return;
 }
 let options='<option value="">Choose curriculum</option>';
 for(const c of DATA.courses.filter(c=>eligible.some(x=>x.course_id===c.id)))options+='<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>';
 const studentInfo='<div class="callout"><strong>'+esc(student.full_name)+'</strong><br>All nine lessons will be visible as cards. Only the first unfinished lesson will be open; future materials stay locked until a teacher grades the previous lesson.</div>';
 el("modalBody").innerHTML=studentInfo+'<form id="pathEnrollmentForm">'+
  select("course_id","Curriculum",options,"required")+
  select("year","Year",'<option value="">Select curriculum first</option>',"required")+
  '<div class="callout" id="pathPreview" style="background:#f7f9f6">Choose a curriculum and year to review its nine lessons.</div>'+
  buttons("Confirm enrollment")+'</form>';
 el("overlay").classList.remove("hidden");
 function updateYears(){
  const courseId=el("f_course_id").value;const valid=eligible.filter(x=>x.course_id===courseId);
  el("f_year").innerHTML='<option value="">Choose year</option>'+valid.map(x=>'<option value="'+x.year+'">Year '+x.year+' · Nine lessons ready</option>').join("");
  if(selected&&selected.course_id===courseId&&valid.some(x=>x.year===selected.year))el("f_year").value=selected.year;
  updatePreview();
 }
 function updatePreview(){
  const courseId=el("f_course_id").value,year=Number(el("f_year").value);
  const label=DATA.courses.find(x=>x.id===courseId)?.name||"";
  if(!year){el("pathPreview").textContent="Choose a year to see the lesson sequence.";return}
  const list=DATA.lessons.filter(x=>x.course_id===courseId&&Number(x.year)===year&&Number(x.lesson_number)>=1&&Number(x.lesson_number)<=9).sort((a,b)=>a.lesson_number-b.lesson_number);
  el("pathPreview").innerHTML='<strong>'+esc(label)+' · Year '+year+'</strong><p>Lesson 1 opens at enrollment. Each subsequent lesson unlocks only after the teacher grades the previous one.</p>'+
  '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px">'+list.map(l=>
   '<div style="padding:9px;background:white;border:1px solid #dbe6df;border-radius:7px;font-size:11px"><strong>Lesson '+esc(l.lesson_number)+'</strong><div style="margin-top:3px;color:#80938c">'+(l.lesson_number===1?"Opens first":"Unlocks in order")+'</div></div>').join("")+'</div>';
 }
 el("f_course_id").addEventListener("change",updateYears);
 el("f_year").addEventListener("change",updatePreview);
 if(selected){el("f_course_id").value=selected.course_id}
 else if(student.course_id&&eligible.some(x=>x.course_id===student.course_id)){el("f_course_id").value=student.course_id}
 updateYears();
 if(!selected&&eligible.some(x=>x.course_id===student.course_id&&x.year===Number(student.current_year))){
  el("f_year").value=student.current_year;updatePreview();
 }
 el("pathEnrollmentForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const courseId=el("f_course_id").value,year=Number(el("f_year").value);
  if(!eligible.some(x=>x.course_id===courseId&&x.year===year)){el("formError").textContent="Select a complete curriculum year.";return}
  const replacing=selected&&(selected.course_id!==courseId||selected.year!==year);
  if(replacing&&!confirm("This student is already enrolled in "+selected.course_name+" Year "+selected.year+". Switch to the new curriculum and year? Existing graded work will be preserved."))return;
  const button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;
  try{
   const result=await api("/api/admin/learning-paths/enroll",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({student_id:studentId,course_id:courseId,year,confirm_replace:!!replacing})});
   closeForm();await refresh();await loadPathEnrollments();
   alert(result.student_name+" is enrolled in "+result.course_name+" Year "+result.year+". "+(result.new_assignments?.length?"The first available lesson has been assigned.":"Their existing lesson progress has been preserved."));
  }catch(err){el("formError").textContent=err.message}
  finally{button.disabled=false}
 });
}
async function loadPathEnrollments(){
 try{const d=await api("/api/admin/learning-paths");ACTIVE_LEARNING_PATHS=new Map(d.enrollments.map(x=>[x.student_id,x]));addPathButtons()}catch(e){console.warn("Cannot load learning paths",e.message)}
}
(function createNotificationPanel(){
 const ref=document.querySelector('[data-tab="roster"]')||document.querySelector('[data-tab="curriculum"]');
 const staff=document.getElementById("page-staff");
 if(!ref||!staff)return;
 ref.insertAdjacentHTML("afterend",'<button class="nav-item" data-tab="notifications" onclick="switchTab(\'notifications\');document.getElementById(\'topTitle\').textContent=\'Email notifications\';loadMTINotifications()"><i>✉</i><span>Email notifications</span></button>');
 staff.insertAdjacentHTML("beforebegin",'<section class="page" id="page-notifications"><div class="heading"><div><h1>Email notifications</h1><p>Submission alerts to administrators; assignment, grading and correction alerts to students.</p></div><button class="outline" onclick="loadMTINotifications()">↻ Refresh status</button></div><div id="emailSetup"></div><div class="panel"><div class="panel-head"><div><h2>Recent email events</h2><p>Delivery status is tracked separately from assignments and grades.</p></div><button class="outline" id="sendPendingButton" onclick="sendPendingMTINotifications()">Retry pending</button></div><div id="notificationHistory"></div></div></section>');
})();
async function loadMTINotifications(){
 const target=el("emailSetup");if(!target)return;
 if(ACCOUNT?.role==="teacher"){target.innerHTML='<div class="callout">Only administrators can view email delivery settings.</div>';return}
 try{
  const r=await api("/api/admin/notifications");
  const count=Object.fromEntries(r.counts.map(x=>[x.status,x.n]));
  const pending=(count.pending||0)+(count.failed||0);
  target.innerHTML=r.configured?
   '<div class="callout"><strong>Email delivery is configured.</strong> Pending: '+pending+' · Sent: '+(count.sent||0)+'.</div>':
   '<div class="warning"><strong>Email delivery is not connected yet.</strong> MTI is recording notification events but cannot send them until a verified sending domain and email API key are connected. No email is falsely marked as sent. Pending: '+pending+'.</div>';
  el("sendPendingButton").disabled=!r.configured;
  el("notificationHistory").innerHTML=r.recent.length?table(["When","Event","Recipient","Status","Attempts"],r.recent.map(x=>row([
   esc(x.created_at)+" UTC",esc(x.event_type.replaceAll("_"," ")),
   esc(x.recipient_email),badge(x.status),String(x.attempts)
  ]))):empty("No notification events yet");
 }catch(err){target.innerHTML='<div class="warning">'+esc(err.message)+'</div>'}
}
async function sendPendingMTINotifications(){
 try{const d=await api("/api/admin/notifications/send-pending",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
 alert(d.configured?"Email delivery attempted. Sent: "+d.sent+" · Failed: "+(d.failed||0):"Email sender is not connected yet.");
 await loadMTINotifications();
 }catch(err){alert(err.message)}
}
const pathStart=start;
start=async function(){await pathStart();if(ACCOUNT&&!ACCOUNT.must_change_password)await loadPathEnrollments()};

Promise.resolve().then(async ()=>{const me=await api("/api/admin/me");if(me.authenticated)await loadPathEnrollments()}).catch(()=>{});
