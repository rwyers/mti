/* MTI private staged student roster UI — loaded only with admin page. */
(function(){
 const nav=document.querySelector('[data-tab="curriculum"]');
 const section=document.getElementById("page-staff");
 if(!nav||!section)return;
 nav.insertAdjacentHTML("afterend",'<button class="nav-item" data-tab="roster" onclick="switchTab(\'roster\');document.getElementById(\'topTitle\').textContent=\'Student import review\';loadRosterReview()"><i>☑</i><span>Roster review</span></button>');
 section.insertAdjacentHTML("beforebegin",'<section class="page" id="page-roster">'+
 '<div class="heading"><div><h1>Student import review</h1><p>Confirm the original student records before adding them to MTI.</p></div><button class="outline" onclick="loadRosterReview()">↻ Refresh review</button></div>'+
 '<div class="callout">These are private staging entries from the uploaded MTI Student Database workbook. No student accounts have been created from them. Only approve a row after confirming its email, field of study, year and lesson. Invitations are a separate step.</div>'+
 '<div class="stats" id="rosterStats"></div><div class="panel"><div class="panel-head"><div><h2>Student import candidates</h2><p>Incomplete and shared-email records remain pending until reviewed.</p></div></div><div id="rosterTable"></div></div></section>');
})();
var STAGED=[];
function issueList(v) {
 const issues=[];
 if(v.original_status!=="Active")issues.push("Not marked active");
 if(!v.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))issues.push("Email needed");
 if(!v.course_name)issues.push("Course needed");
 if(!v.current_year||!v.current_lesson)issues.push("Year / lesson needed");
 if(STAGED.filter(x=>x.review_status!=="skipped"&&x.email&&x.email.toLowerCase()===v.email.toLowerCase()).length>1&&v.email)issues.push("Shared email");
 return issues;
}
async function loadRosterReview(){
 if(ACCOUNT?.role==="teacher"){el("rosterTable").innerHTML=empty("Administrator access required");return}
 try{
  const data=await api("/api/admin/roster-review");STAGED=data.items;
  const pending=STAGED.filter(x=>x.review_status==="pending");
  const flagged=pending.filter(x=>issueList(x).length);
  const done=STAGED.filter(x=>x.review_status==="approved").length;
  el("rosterStats").innerHTML=[["Staged entries",STAGED.length],["Pending review",pending.length],["Need attention",flagged.length],["Approved",done]].map(x=>'<div class="stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join("");
  el("rosterTable").innerHTML=table(["Source row","Student","Enrollment","Status","Review notes","Actions"],STAGED.map(function(v){
   const flags=issueList(v),pending=v.review_status==="pending";
   const actions=pending?'<button class="soft" onclick="editRoster('+JSON.stringify(v.id)+')">Edit</button> <button class="outline" onclick="approveRoster('+JSON.stringify(v.id)+')">Approve</button> <button class="outline" onclick="skipRoster('+JSON.stringify(v.id)+')">Skip</button>':"Reviewed";
   return row(["<strong>#"+esc(v.source_row)+"</strong>","<strong>"+esc(v.full_name)+"</strong><br><small>"+esc(v.email||"No email")+"</small>",
    esc(v.course_name||"Not assigned")+"<br><small>Year "+esc(v.current_year||"—")+" · Lesson "+esc(v.current_lesson||"—")+"</small>",
    badge(v.review_status),flags.length?'<span style="color:#9f623e">'+flags.map(esc).join(" · ")+"</span>":'<span style="color:#4d8866">Ready to review</span>',actions]);
  }));
 }catch(err){el("rosterTable").innerHTML='<div class="empty">'+esc(err.message)+'</div>'}
}
async function approveRoster(id){
 const r=STAGED.find(x=>x.id===id);if(!r)return;
 if(issueList(r).length){alert("Resolve the highlighted issues before approving this row.");return}
 if(!confirm("Approve "+r.full_name+" as an MTI student? This adds a student record but does not send an invitation."))return;
 try{await api("/api/admin/roster-review/approve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});await refresh();await loadRosterReview()}
 catch(e){alert(e.message)}
}
async function skipRoster(id){
 if(!confirm("Mark this source row as skipped? No student record will be created."))return;
 try{await api("/api/admin/roster-review/skip",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});loadRosterReview()}
 catch(e){alert(e.message)}
}
function editRoster(id) {
 const r=STAGED.find(x=>x.id===id);if(!r)return;
 el("modalTitle").textContent="Review student";
 const courseList=selectOptions(DATA.courses,"Choose a program",x=>x.name);
 const yoptions='<option value="0">Choose year</option>'+optsNums(5,Number(r.current_year));
 const statusOptions='<option value="">Not verified</option><option value="Active">Active</option><option value="Inactive">Inactive</option>';
 const content='<div class="formgrid">'+input("full_name","Full name","text",r.full_name,"required")+
 input("email","Student email","email",r.email)+input("phone","Phone","tel",r.phone)+
 select("course_name","Program",'<option value="">Choose course</option>'+DATA.courses.map(c=>'<option value="'+esc(c.name)+'">'+esc(c.name)+'</option>').join(""))+
 select("current_year","Current year",yoptions)+input("current_lesson","Current lesson","number",r.current_lesson||0,'min=0 max=52')+
 select("original_status","Enrollment status",statusOptions)+
 '<div class="span2">'+area("notes","Private notes",r.notes)+'</div></div>'+buttons("Save review changes");
 el("modalBody").innerHTML='<form id="recordForm">'+content+'</form>';el("formError").textContent="";el("overlay").classList.remove("hidden");
 el("f_course_name").value=r.course_name||"";el("f_original_status").value=r.original_status||"";
 el("recordForm").addEventListener("submit",async function(e){
  e.preventDefault();const b={id};new FormData(this).forEach((v,k)=>b[k]=v);
  const button=this.querySelector('[type=submit]');button.disabled=true;
  try{await api("/api/admin/roster-review/edit",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});closeForm();loadRosterReview()}
  catch(err){el("formError").textContent=err.message}finally{button.disabled=false}
 });
}
