/* Student-grouped MTI assignments: needs-marking students first. */
const MTI_OPEN_STUDENT_CARDS=new Map();
let MTI_ASSIGN_SEARCH="";
function mtiStudentAssignmentGroups(){
 const map=new Map();
 for(const a of DATA.assignments||[]){
  let group=map.get(a.student_id);
  if(!group){
   const student=DATA.students.find(s=>s.id===a.student_id);
   group={id:a.student_id,name:student?.full_name||"Student",email:student?.email||"",assignments:[],pending:0,assigned:0,graded:0,recent:""};
   map.set(a.student_id,group);
  }
  group.assignments.push(a);
  if(a.status==="submitted")group.pending++;
  else if(a.status==="graded")group.graded++;
  else group.assigned++;
  const last=a.submitted_at||a.updated_at||a.created_at||"";
  if(last>group.recent)group.recent=last;
 }
 const rank=a=>a.status==="submitted"?0:a.status==="assigned"?1:2;
 return [...map.values()].map(g=>{
  g.assignments.sort((a,b)=>rank(a)-rank(b)||String(b.submitted_at||b.updated_at||b.created_at||"").localeCompare(String(a.submitted_at||a.updated_at||a.created_at||"")));
  return g;
 }).sort((a,b)=>Number(b.pending>0)-Number(a.pending>0)||b.pending-a.pending||b.recent.localeCompare(a.recent)||a.name.localeCompare(b.name));
}
function renderMTIStudentAssignmentCards(root,maxStudents){
 if(!root||!DATA)return;
 let groups=mtiStudentAssignmentGroups();
 if(root.id==="assignmentTable"&&MTI_ASSIGN_SEARCH){
  const term=MTI_ASSIGN_SEARCH.toLowerCase();
  groups=groups.filter(g=>[g.name,g.email,...g.assignments.map(a=>a.title)].join(" ").toLowerCase().includes(term));
 }
 if(maxStudents)groups=groups.slice(0,maxStudents);
 if(!groups.length){root.innerHTML='<div class="empty">No matching student assignments.</div>';return}
 const summary=root.id==="recent"?"Students awaiting marking are listed first. Open a student card to view all their assignments.":"Grouped by student, with submissions awaiting marking at the top.";
 root.innerHTML='<div class="mti-student-assignment-groups"><p class="mti-cards-help">'+summary+'</p>'+
 groups.map(group=>{
  const expanded=MTI_OPEN_STUDENT_CARDS.has(group.id)?MTI_OPEN_STUDENT_CARDS.get(group.id):group.pending>0;
  const pills='<span class="mti-counts">'+(group.pending?'<span class="mti-pending-count">'+group.pending+' to mark</span>':"")+
   '<span>'+group.assigned+' assigned</span><span>'+group.graded+' graded</span></span>';
  return '<details class="mti-student-card" data-mti-student="'+esc(group.id)+'"'+(expanded?' open':'')+'><summary><span class="mti-heading"><strong>'+esc(group.name)+'</strong>'+pills+'</span><span aria-hidden="true">⌄</span></summary>'+
   '<div class="mti-card-list">'+group.assignments.map(a=>{
    const lesson=DATA.lessons.find(x=>x.id===a.lesson_id);
    const course=lesson?DATA.courses.find(c=>c.id===lesson.course_id)?.name||"Course":"Individual assignment";
    const subtitle=lesson?course+" · Year "+lesson.year+" · Lesson "+lesson.lesson_number:"Individual assignment";
    return '<div class="mti-student-assignment'+(a.status==="submitted"?" mti-awaiting-grade":"")+'"><span class="mti-assign-title"><strong>'+esc(a.title)+'</strong><small>'+esc(subtitle)+' · '+(a.status==="graded"?"Grade "+(a.grade_points==null?"—":esc(a.grade_points)+"/100"):"Due "+esc(a.due_date||"Not set"))+'</small></span>'+
     '<span class="mti-assign-actions">'+badge(a.status)+'<button type="button" class="outline" data-mti-review="'+esc(a.id)+'">'+(a.status==="submitted"?"Mark now":a.status==="graded"?"View grade":"Review")+' →</button>'+
     (a.status==="assigned"&&ACCOUNT&&["owner","admin"].includes(ACCOUNT.role)?'<button type="button" class="outline" data-unassign-id="'+esc(a.id)+'" style="color:#9b4742;border-color:#e9ccc8">Unassign</button>':"")+'</span></div>';
   }).join("")+'</div></details>';
 }).join("")+'</div>';
}
(function initialiseAssignmentCards(){
 const style=document.createElement("style");
 style.textContent=".mti-student-assignment-groups{padding:14px;display:grid;gap:12px}.mti-cards-help{font-size:12px;color:#647c78;margin:2px 0 8px}.mti-student-card{border:1px solid #dce6de;border-radius:10px;overflow:hidden;background:white}.mti-student-card[open]{border-color:#bcd3c5}.mti-student-card>summary{cursor:pointer;list-style:none;padding:17px;display:flex;justify-content:space-between;align-items:center;gap:12px}.mti-student-card>summary::-webkit-details-marker{display:none}.mti-student-card>summary:focus-visible{outline:2px solid #548c72}.mti-heading{display:grid;gap:9px}.mti-heading>strong{font-size:15px;color:#163e4b}.mti-counts{display:flex;flex-wrap:wrap;gap:7px;font-size:11px;color:#58736a}.mti-counts span{padding:4px 8px;background:#f0f5f1;border-radius:7px}.mti-counts .mti-pending-count{color:#986125;background:#fff0d7;font-weight:800}.mti-card-list{border-top:1px solid #e4ebe5;max-height:520px;overflow-y:auto}.mti-student-assignment{display:flex;align-items:center;justify-content:space-between;padding:12px 17px;gap:12px;border-bottom:1px solid #e9f0ea}.mti-student-assignment:last-child{border-bottom:0}.mti-awaiting-grade{background:#fffbf2}.mti-assign-title{display:grid;gap:5px;min-width:0}.mti-assign-title strong{font-size:12px;color:#1b3f4d;overflow-wrap:anywhere}.mti-assign-title small{font-size:11px;color:#6c847c;line-height:1.5}.mti-assign-actions{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:7px;flex-shrink:0}.mti-assign-actions button{padding:7px 10px;font-size:11px}@media(max-width:650px){.mti-student-assignment{flex-direction:column;align-items:stretch}.mti-assign-actions{justify-content:flex-start}.mti-student-assignment-groups{padding:9px}}";
 document.head.appendChild(style);
 document.addEventListener("click",e=>{
  const button=e.target.closest("button[data-mti-review]");
  if(button){e.preventDefault();openForm("grade",button.dataset.mtiReview)}
 });
 document.addEventListener("toggle",e=>{
  if(e.target?.matches?.(".mti-student-card"))MTI_OPEN_STUDENT_CARDS.set(e.target.dataset.mtiStudent,e.target.open);
 },true);
 const table=document.getElementById("assignmentTable");
 if(table){
  const search=document.createElement("input");
  search.type="search";search.placeholder="Search by student or assignment…";
  search.className="search";search.setAttribute("aria-label","Search students and assignments");
  search.style.cssText="max-width:360px;width:95%;margin:16px 18px 4px";
  table.before(search);
  search.addEventListener("input",()=>{MTI_ASSIGN_SEARCH=search.value;renderMTIStudentAssignmentCards(table,0)});
 }
})();
const MTI_ORIGINAL_ASSIGNMENT_RENDER=render;
render=function(){
 MTI_ORIGINAL_ASSIGNMENT_RENDER();
 renderMTIStudentAssignmentCards(document.getElementById("recent"),5);
 renderMTIStudentAssignmentCards(document.getElementById("assignmentTable"),0);
 // Keep the grading page's normal table, with submissions awaiting marking first.
 const body=document.querySelector("#gradingTable tbody");
 if(body){
  const rows=[...body.querySelectorAll("tr")];
  rows.sort((a,b)=>{
   const order=t=>t.includes("submitted")?0:t.includes("assigned")?1:2;
   return order(a.textContent)-order(b.textContent);
  });
  rows.forEach(row=>body.appendChild(row));
 }
};
