/* MTI admin enrollment controls for year-wide nine-session progress.
 * Separate annual approvals; switching a curriculum preserves session credits.
 */
var YEAR_PATHS_BY_STUDENT=new Map();
loadPathEnrollments=async function(){
 try{
  const response=await api("/api/admin/learning-paths");
  YEAR_PATHS_BY_STUDENT=new Map();
  for(const year of response.enrollments){
   if(!YEAR_PATHS_BY_STUDENT.has(year.student_id))YEAR_PATHS_BY_STUDENT.set(year.student_id,[]);
   YEAR_PATHS_BY_STUDENT.get(year.student_id).push(year);
  }
  ACTIVE_LEARNING_PATHS=new Map([...YEAR_PATHS_BY_STUDENT].map(([id,years])=>[id,years.find(y=>y.status==="active")||years[0]]));
  addPathButtons();
 }catch(e){console.warn("Failed to load MTI year enrollments",e.message)}
};
openPathEnrollment=async function(studentId){
 const student=DATA.students.find(s=>s.id===studentId);
 if(!student)return;
 await loadPathEnrollments();
 const eligible=completeCurriculumYears();
 const years=YEAR_PATHS_BY_STUDENT.get(studentId)||[];
 let progress={history:[]};
 try{progress=await api("/api/admin/learning-paths/progress?student_id="+encodeURIComponent(studentId))}catch(e){console.warn(e.message)}
 const current=years.find(x=>x.status==="active");
 const latest=years[0];
 const title="Curriculum and year enrollment";
 el("modalTitle").textContent=title;el("formError").textContent="";
 if(!eligible.length){
  el("modalBody").innerHTML='<div class="callout">No complete nine-session curriculum is available yet.</div><button class="outline" onclick="closeForm()">Close</button>';
  el("overlay").classList.remove("hidden");return;
 }
 const courses=DATA.courses.filter(c=>eligible.some(x=>x.course_id===c.id));
 const options='<option value="">Choose curriculum</option>'+courses.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join("");
 const archive=(progress.history||[]).map(y=>
  '<details style="border:1px solid #e0e9e2;border-radius:8px;margin:8px 0;padding:10px"><summary style="cursor:pointer"><strong>Year '+esc(y.year)+'</strong> · '+esc(y.course_name)+' · <strong>'+y.completed_count+'/9</strong> '+(y.status==="completed"?"✓ Completed":"In progress")+'</summary>'+
  '<div style="padding:8px 0;font-size:12px">'+y.sessions.map(x=>'<p style="margin:6px 0">✓ Session '+x.number+' — '+esc(x.course_name)+' · '+esc(x.grade_points===null?"Unmarked":x.grade_points+"/100")+'</p>').join("")+'</div></details>').join("");
 const info='<div class="callout"><strong>'+esc(student.full_name)+'</strong><p style="margin:5px 0 0">Completed sessions stay attached to the student, even when you switch curricula. Year 2 and later require the previous year completed and administrator-confirmed payment.</p></div>';
 el("modalBody").innerHTML=info+(archive?'<h3 style="margin:18px 0 10px">Student year history</h3>'+archive:"")+
 '<form id="yearEnrollForm" style="margin-top:20px">'+
 select("course_id","Curriculum",options,"required")+
 select("year","Academic year",'<option value="">Choose curriculum first</option>',"required")+
 '<div class="callout" id="yearReview" style="background:#f5f8f3">Select a curriculum and year to review its sessions.</div>'+
 '<div id="yearPaymentPanel" class="field hidden" style="padding:15px;border:1px solid #dfd4b9;border-radius:9px;background:#faf7ee">'+
 '<label style="display:flex;align-items:flex-start;gap:10px"><input id="yearPaymentCheck" type="checkbox" style="width:auto;margin-top:4px"> <span>I confirm MTI received payment for this next academic year and I approve enrollment.</span></label></div>'+
 '<div class="modal-actions"><button type="button" class="outline" onclick="closeForm()">Cancel</button><button class="primary" type="submit">Confirm enrollment</button></div></form>';
 el("overlay").classList.remove("hidden");
 const courseInput=el("f_course_id"),yearInput=el("f_year");
 const initial=current||latest;
 function renderYearChoices(){
  const courseId=courseInput.value;
  const candidates=eligible.filter(e=>e.course_id===courseId);
  const previous=Number(yearInput.value);
  yearInput.innerHTML='<option value="">Choose year</option>'+candidates.map(x=>
   '<option value="'+x.year+'">Year '+x.year+' · Nine sessions ready</option>').join("");
  if(candidates.some(x=>x.year===previous))yearInput.value=String(previous);
  else if(initial&&candidates.some(x=>x.year===initial.year))yearInput.value=String(initial.year);
  renderReview();
 }
 function renderReview(){
  const courseId=courseInput.value,year=Number(yearInput.value);
  if(!year||!courseId){el("yearReview").textContent="Choose a curriculum and year.";el("yearPaymentPanel").classList.add("hidden");return}
  const name=DATA.courses.find(c=>c.id===courseId)?.name||"";
  const previous=years.find(y=>y.year===year);
  const finished=(progress.history||[]).find(y=>y.year===year);
  const finishedNumbers=new Set(finished?.sessions.map(s=>s.number)||[]);
  const next=Array.from({length:9},(_,i)=>i+1).find(n=>!finishedNumbers.has(n));
  const transfer=previous&&previous.course_id!==courseId;
  const ready=year===1||!!years.find(y=>y.year===year-1&&y.status==="completed");
  const paymentNeeded=year>1&&!previous;
  el("yearPaymentPanel").classList.toggle("hidden",!paymentNeeded);
  if(!paymentNeeded)el("yearPaymentCheck").checked=false;
  el("yearReview").innerHTML='<strong>'+esc(name)+' · Year '+year+'</strong>'+
   '<p>'+finishedNumbers.size+' of 9 sessions credited. '+(next?"Session "+next+" will be the next open lesson.":"All nine sessions are complete.")+'</p>'+
   (transfer?'<p style="color:#95693f"><strong>Curriculum transfer:</strong> the completed sessions stay credited; new sessions use '+esc(name)+'.</p>':"")+
   (!ready?'<p style="color:#a14949"><strong>Previous year must be completed first.</strong></p>':"")+
   (paymentNeeded?'<p><strong>Payment confirmation is required before this year can be assigned.</strong></p>':"")+
   '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:12px 0">'+
   Array.from({length:9},(_,i)=>i+1).map(n=>'<div style="background:white;border-radius:7px;padding:8px;font-size:11px">'+(finishedNumbers.has(n)?"✓":"○")+' Session '+n+'</div>').join("")+'</div>';
 }
 courseInput.addEventListener("change",renderYearChoices);
 yearInput.addEventListener("change",renderReview);
 if(initial&&eligible.some(x=>x.course_id===initial.course_id))courseInput.value=initial.course_id;
 else if(student.course_id&&eligible.some(x=>x.course_id===student.course_id))courseInput.value=student.course_id;
 renderYearChoices();
 el("yearEnrollForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const courseId=courseInput.value,year=Number(yearInput.value);
  if(!eligible.some(x=>x.course_id===courseId&&x.year===year)){el("formError").textContent="Choose a valid complete year.";return}
  const previous=years.find(y=>y.year===year),replace=!!previous&&previous.course_id!==courseId;
  const paymentConfirmed=year>1&&!previous&&el("yearPaymentCheck").checked;
  if(year>1&&!previous&&!paymentConfirmed){el("formError").textContent="Confirm that this academic year has been paid for before enrolling.";return}
  if(replace&&!confirm("Change this student's Year "+year+" curriculum? All completed sessions, grades, files, and feedback will remain saved."))return;
  const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;
  try{
   const saved=await api("/api/admin/learning-paths/enroll",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    student_id:studentId,course_id:courseId,year,confirm_replace:replace,payment_confirmed:paymentConfirmed
   })});
   closeForm();await refresh();await loadPathEnrollments();
   alert(saved.student_name+" — "+saved.course_name+" Year "+saved.year+" saved. "+saved.completed_sessions+"/9 sessions credited."+
    (saved.new_assignments?.length?" Session "+saved.new_assignments[0].lesson_number+" is now available.":""));
  }catch(err){el("formError").textContent=err.message}
  finally{btn.disabled=false}
 });
};
window.openPathEnrollment=openPathEnrollment;
Promise.resolve().then(async()=>{const session=await api("/api/admin/me");if(session.authenticated)await loadPathEnrollments()}).catch(()=>{});
