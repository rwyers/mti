/* MTI administrator workspace — identities, password management, editing and change history. */
function renderProfile(){
 var e=el("profileText");
 if(e&&ACCOUNT)e.innerHTML="<p><strong>Name:</strong> "+esc(ACCOUNT.name)+"</p><p><strong>Email:</strong> "+esc(ACCOUNT.email)+"</p><p><strong>Role:</strong> "+esc(ACCOUNT.role)+"</p>";
}
async function loadStaff(){
 var target=el("staffTable");if(!target)return;
 if(ACCOUNT?.role==="teacher"){target.innerHTML=empty("Staff management is restricted to administrators");return;}
 try{
  var d=await api("/api/admin/accounts");
  target.innerHTML=table(["Name","Email","Role","Status","Last login","Actions"],d.accounts.map(function(a){
   var actions=a.id===ACCOUNT.id?"Your profile":'<button class="outline" onclick="toggleStaff('+JSON.stringify(a.id)+','+(!a.active)+')">'+(a.active?"Disable":"Enable")+'</button> ';
   actions+='<button class="soft" onclick="reInviteStaff('+JSON.stringify(a.id)+')">Issue invitation</button>';
   return row(["<strong>"+esc(a.name)+"</strong>",esc(a.email),esc(a.role),
    a.active?(a.invited?badge("invited"):badge("active")):badge("inactive"),
    esc(a.last_login_at||"Never"),actions]);
  }));
 }catch(err){target.innerHTML='<div class="empty">'+esc(err.message)+'</div>';}
}
async function loadActivity(){
 var target=el("activityTable");if(!target)return;
 try{
  var d=await api("/api/admin/audit");
  target.innerHTML=d.events.length?table(["Time","Administrator","Action","Record","Details"],d.events.map(function(a){
   var details=(a.before_json||a.after_json)?'<details><summary style="cursor:pointer">Show change</summary><div style="max-height:260px;overflow:auto;font-size:11px;white-space:pre-wrap"><b>Before:</b> '+esc(a.before_json||"—")+'<hr><b>After:</b> '+esc(a.after_json||"—")+'</div></details>':"—";
   return row([esc(a.created_at)+" UTC","<strong>"+esc(a.actor_name)+"</strong><br><small>"+esc(a.actor_email)+"</small>",
    esc(a.action),esc(a.target_type),details]);
  })):empty("No activity events yet");
 }catch(err){target.innerHTML='<div class="empty">'+esc(err.message)+'</div>';}
}
function showInvite(path){
 var url=location.origin+path;
 el("modalTitle").textContent="Private invitation ready";
 el("modalBody").innerHTML='<p>Send this link directly to its intended recipient. The link is single-use and valid for seven days.</p>'+
 '<div class="field"><label for="inviteLink">Account setup link</label><input readonly id="inviteLink" value="'+esc(url)+'"></div>'+
 '<div class="modal-actions"><button class="outline" onclick="closeForm()">Done</button><button class="primary" onclick="copyInvite()">Copy link</button></div>';
 el("overlay").classList.remove("hidden");
}
async function copyInvite(){
 var inp=el("inviteLink");inp.select();
 try{await navigator.clipboard.writeText(inp.value);alert("Invitation link copied.")}catch{alert("Link selected. Copy the selected text.")}
}
async function inviteStudent(id){
 if(!confirm("Create a student invitation? Any earlier unused invitation for this student will expire."))return;
 try{
  var d=await api("/api/admin/invite-student",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({student_id:id})});
  showInvite(d.invite_url);
 }catch(err){alert(err.message);}
}
async function reInviteStaff(id){
 if(!confirm("Issue a new invitation? Any existing password and active sessions for this account will be invalidated."))return;
 try{
  var d=await api("/api/admin/accounts/"+id+"/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  showInvite(d.invite_url);loadStaff();
 }catch(err){alert(err.message);}
}
async function toggleStaff(id,active){
 if(!confirm((active?"Enable":"Disable")+" this staff account?"))return;
 try{
  await api("/api/admin/accounts/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({active:active})});
  loadStaff();
 }catch(err){alert(err.message);}
}
function addActions(){
 var st=DATA.students.filter(function(s){
  var term=(el("studentSearch").value||"").toLowerCase();
  return [s.full_name,s.email,s.phone].join(" ").toLowerCase().includes(term);
 });
 function addButtons(parent,records,make){
  var table=el(parent)?.querySelector("table");if(!table)return;
  if(table.dataset.actions==="yes")return;
  table.dataset.actions="yes";var th=document.createElement("th");th.textContent="Actions";table.querySelector("thead tr")?.appendChild(th);
  var trs=table.querySelectorAll("tbody tr");
  Array.prototype.forEach.call(trs,function(tr,i){var cell=document.createElement("td");cell.innerHTML=make(records[i]);tr.appendChild(cell)});
 }
 addButtons("studentTable",st,function(a){
  return '<button class="soft" onclick="openForm(\'editstudent\',\''+esc(a.id)+'\')">Edit</button> <button class="outline" onclick="inviteStudent(\''+esc(a.id)+'\')">Invite</button>';
 });
 addButtons("courseTable",DATA.courses,function(a){
  return '<button class="soft" onclick="openForm(\'editcourse\',\''+esc(a.id)+'\')">Edit</button>';
 });
 var tbody=el("lessonTable")?.querySelectorAll("tbody tr");
 if(tbody)Array.prototype.forEach.call(tbody,function(tr,i){
  if(tr.dataset.editLink)return;tr.dataset.editLink="yes";
  var cell=tr.querySelector("td:last-child");
  if(cell&&DATA.lessons[i])cell.insertAdjacentHTML("beforeend",' <button class="outline" onclick="openForm(\'editlesson\',\''+esc(DATA.lessons[i].id)+'\')">Edit</button>');
 });
}
var previousRender=render;
render=function(){previousRender();addActions()};
var previousOpenForm=openForm;
openForm=function(type,id){
 if(!["staff","password","editstudent","editcourse","editlesson"].includes(type)){
  previousOpenForm(type,id);
  if(type==="grade"){
   var submission=DATA.submissions?.find(function(s){return s.assignment_id===id});
   var form=el("recordForm");
   if(submission&&form)form.insertAdjacentHTML("afterbegin",'<div class="callout" style="background:#f3f8f5"><strong>Student submitted:</strong><p style="white-space:pre-wrap;margin:12px 0 0">'+esc(submission.response_text)+'</p><small>Submitted '+esc(submission.submitted_at)+'</small></div>');
  }
  return;
 }
 var title="",fields="",record=null,onSave;
 var copt=selectOptions(DATA.courses,"Select course",function(c){return c.name});
 if(type==="staff"){
  title="Invite a staff member";
  fields=input("name","Full name","text","","required maxlength=150")+input("email","Email address","email","","required")+
   select("role","Account role",'<option value="admin">Administrator — manage staff and all school records</option><option value="teacher">Teacher — students, lessons, assignments and grading</option>')+
   buttons("Create account and invitation");
  onSave=async function(b){
   var out=await api("/api/admin/accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
   showInvite(out.invite_url);loadStaff();
  };
 }
 if(type==="password"){
  title="Change my password";
  fields=input("old_password","Current password","password","","required autocomplete=current-password")+
   input("new_password","New password (at least 12 characters)","password","","required minlength=12 autocomplete=new-password")+
   input("confirm_password","Confirm new password","password","","required minlength=12 autocomplete=new-password")+
   buttons("Update password");
  onSave=async function(b){
   if(b.new_password!==b.confirm_password)throw Error("New passwords do not match.");
   await api("/api/admin/change-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
   if(ACCOUNT)ACCOUNT.must_change_password=false;
   closeForm();await start();alert("Password changed successfully.");
  };
 }
 if(type==="editstudent"){
  record=DATA.students.find(function(x){return x.id===id});if(!record)return;
  title="Edit student";
  fields='<div class="formgrid">'+input("full_name","Full name","text",record.full_name,"required")+
   input("email","Email","email",record.email)+input("phone","Phone","tel",record.phone)+
   select("course_id","Course",copt)+select("current_year","Current year",optsNums(5,Number(record.current_year)))+
   input("current_lesson","Current lesson","number",record.current_lesson,'min=1 required')+
   select("status","Status",'<option value="active">Active</option><option value="inactive">Inactive</option>')+
   '<div class="span2">'+area("notes","Private notes",record.notes)+'</div></div>'+buttons("Save student");
  onSave=async function(b){await api("/api/admin/students/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});closeForm();await refresh();};
 }
 if(type==="editcourse"){
  record=DATA.courses.find(function(x){return x.id===id});if(!record)return;
  title="Edit course";fields=input("name","Course name","text",record.name,"required")+area("description","Description",record.description)+buttons("Save course");
  onSave=async function(b){await api("/api/admin/courses/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});closeForm();await refresh();};
 }
 if(type==="editlesson"){
  record=DATA.lessons.find(function(x){return x.id===id});if(!record)return;
  title="Edit lesson";
  fields='<div class="formgrid">'+select("course_id","Course",copt,"required")+
   select("year","Year",optsNums(5,Number(record.year)))+
   input("lesson_number","Lesson number","number",record.lesson_number,'min=1 max=52 required')+
   input("credits","Credits","number",record.credits,'min=0')+
   input("memory_verse_reference","Scripture reference","text",record.memory_verse_reference)+
   '<div class="span2">'+area("memory_verse_text","Memory verse text",record.memory_verse_text)+
   area("bible_instruction","Bible instructions",record.bible_instruction)+
   area("assignment_instructions","Assignment instructions",record.assignment_instructions)+
   area("submission_notes","Submission notes",record.submission_notes)+
   area("materials_list","Materials list",record.materials_list)+'</div></div>'+buttons("Save lesson");
  onSave=async function(b){await api("/api/admin/lessons/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});closeForm();await refresh();};
 }
 el("modalTitle").textContent=title;el("formError").textContent="";
 el("modalBody").innerHTML='<form id="recordForm">'+fields+'</form>';el("overlay").classList.remove("hidden");
 if(record?.course_id&&el("f_course_id"))el("f_course_id").value=record.course_id;
 if(type==="editstudent")el("f_status").value=record.status;
 el("recordForm").addEventListener("submit",async function(e){
  e.preventDefault();var data={};new FormData(this).forEach(function(v,k){data[k]=v});
  var btn=this.querySelector('[type="submit"]');btn.disabled=true;el("formError").textContent="";
  try{await onSave(data)}catch(err){el("formError").textContent=err.message}finally{btn.disabled=false;}
 });
};window.openForm=openForm;
start=async function(){
 try{
  var data=await api("/api/admin/me");
  if(!data.authenticated){el("loginPage").classList.remove("hidden");el("app").classList.add("hidden");return;}
  ACCOUNT=data.user;el("loginPage").classList.add("hidden");el("app").classList.remove("hidden");
  var staffTab=document.querySelector('[data-tab="staff"]');
  if(staffTab)staffTab.classList.toggle("hidden",ACCOUNT.role==="teacher");
  renderProfile();
  if(ACCOUNT.must_change_password){
   switchTab("profile");openForm("password");
   el("formError").textContent="Please change your original shared admin password to a personal password before proceeding.";
   return;
  }
  await refresh();
 }catch(err){el("loginError").textContent=err.message;}
};
function activateInvitation(token){
 el("loginPage").classList.remove("hidden");el("app").classList.add("hidden");
 document.querySelector(".login-box").innerHTML=
  '<div class="eyebrow" style="font-size:11px;letter-spacing:2px;color:#ac8b5e;font-weight:800">PRIVATE MTI INVITATION</div>'+
  '<h2>Activate your account.</h2><p>Choose your own secure login password.</p>'+
  '<form id="activationForm">'+input("new_password","New password (12+ characters)","password","","required minlength=12")+
  input("confirm_password","Confirm password","password","","required minlength=12")+
  '<div id="activationError" role="alert" style="color:#a44545;margin:12px 0"></div>'+
  '<button class="primary" style="width:100%" type="submit">Activate account →</button></form>';
 el("activationForm").addEventListener("submit",async function(e){
  e.preventDefault();
  var pw=el("f_new_password").value;
  if(pw!==el("f_confirm_password").value){el("activationError").textContent="Passwords do not match.";return;}
  try{
   await api("/api/auth/accept-invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:token,password:pw})});
   history.replaceState(null,"","/admin");location.reload();
  }catch(err){el("activationError").textContent=err.message;}
 });
}
var invitation=new URLSearchParams(location.search).get("invite");
if(invitation)activateInvitation(invitation);
else start();
