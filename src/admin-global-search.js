/* MTI global record finder: links directly to the matching lesson, student, course,
   assignment, submission, attachment or authorized staff directory entry. */
(function installMtiGlobalFinder(){
 const app=document.getElementById("app"),top=app?.querySelector(".top");
 if(!top||document.getElementById("mtiGlobalFind"))return;
 const css=document.createElement("style");
 css.textContent=[
 '.mti-find{position:relative;flex:1 1 370px;max-width:570px;min-width:170px;z-index:40}',
 '.mti-find input{border:1px solid #d2e0d8;border-radius:10px;background:#f7faf8;padding:11px 40px 11px 35px;font-size:13px;width:100%}',
 '.mti-find input:focus{background:white;border-color:#7ca88c;box-shadow:0 0 0 3px #d8ede2}',
 '.mti-find-icon{position:absolute;top:9px;left:11px;font-size:20px;color:#587d68;pointer-events:none}',
 '.mti-find-key{position:absolute;right:10px;top:11px;font-size:10px;color:#728a7e;border:1px solid #d6e3da;padding:1px 4px;border-radius:4px;pointer-events:none}',
 '.mti-find-list{position:absolute;left:0;right:0;top:calc(100% + 8px);min-width:300px;border:1px solid #d5e4dc;background:white;border-radius:12px;box-shadow:0 15px 45px #143c4950;z-index:70;overflow:hidden}',
 '.mti-find-list[hidden]{display:none!important}',
 '.mti-find-meta{background:#f5faf7;border-bottom:1px solid #e0eae4;padding:10px 14px;font-size:11px;font-weight:750;color:#557065}',
 '.mti-find-scroll{max-height:min(63vh,610px);overflow-y:auto}',
 '.mti-find-hit{display:block;width:100%;background:white;border:0;border-bottom:1px solid #edf1ee;padding:11px 14px;text-align:left;color:#213f4b;cursor:pointer}',
 '.mti-find-hit:hover,.mti-find-hit[aria-selected=true]{background:#eaf3ff}',
 '.mti-find-hit strong{font-size:13px}',
 '.mti-find-tag{display:inline-block;font-size:10px;font-weight:750;color:#436455;background:#eff5f1;padding:2px 6px;border-radius:5px;margin-right:7px}',
 '.mti-find-sub{font-size:11px;color:#697e79;margin:5px 0 0;line-height:1.4}',
 '.mti-find-preview{font-size:11px;color:#415c59;line-height:1.5;margin-top:5px;overflow-wrap:anywhere}',
 '.mti-find mark{background:#ffedaf;color:#1b3c4b}',
 '.mti-find-none{padding:23px 16px;text-align:center;font-size:12px;color:#607872}',
 '@media(max-width:900px){.top .crumb{display:none}.mti-find{max-width:none;min-width:0}.top>div:last-child>span{display:none}}',
 '@media(max-width:700px){.mti-find input{font-size:12px;padding:10px 9px 10px 32px}.mti-find-icon{top:8px;left:9px}.mti-find-key{display:none}.mti-find-list{position:fixed;left:82px;right:8px;top:70px;min-width:0;max-height:76vh}}'
 ].join("");
 document.head.appendChild(css);
 const shell=document.createElement("div");
 shell.className="mti-find";
 shell.innerHTML='<span class="mti-find-icon" aria-hidden="true">⌕</span>'+
  '<input type="search" id="mtiGlobalFind" autocomplete="off" spellcheck="false" placeholder="Search books, lessons, students, anything…" aria-label="Search all MTI admin records" role="combobox" aria-controls="mtiGlobalFindList" aria-expanded="false" aria-autocomplete="list">'+
  '<span class="mti-find-key">Ctrl K</span><div class="mti-find-list" role="listbox" id="mtiGlobalFindList" hidden></div>';
 top.querySelector(".crumb")?.after(shell);
 const input=shell.querySelector("input"),box=shell.querySelector(".mti-find-list");
 let matches=[],chosen=-1,staff=[],staffLoaded=false,staffLoading=false;
 const lower=x=>String(x==null?"":x).toLocaleLowerCase();
 const clean=x=>lower(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 const text=x=>String(x==null?"":x);
 const field=(label,value,key="")=>({label,value:text(value),key});
 const student=id=>(DATA?.students||[]).find(x=>x.id===id);
 const lesson=id=>(DATA?.lessons||[]).find(x=>x.id===id);
 const course=id=>(DATA?.courses||[]).find(x=>x.id===id);
 const assignment=id=>(DATA?.assignments||[]).find(x=>x.id===id);
 const lessonTitle=l=>(course(l.course_id)?.name||"Course")+" · Year "+l.year+" · Lesson "+l.lesson_number;
 const index=()=>{
  const out=[];
  const add=(type,id,title,detail,tab,form,fields,weight=0)=>out.push({type,id,title,detail,tab,form,fields,weight});
  for(const c of DATA?.courses||[])add("Course",c.id,c.name,"Course details","courses","editcourse",
   [field("Course",c.name,"name"),field("Description",c.description,"description")],4);
  for(const s of DATA?.students||[])add("Student",s.id,s.full_name||"Student",
   (course(s.course_id)?.name||"No course")+" · Year "+(s.current_year||"—"),"students","editstudent",
   [field("Name",s.full_name,"full_name"),field("Email",s.email,"email"),field("Phone",s.phone,"phone"),
    field("Course",course(s.course_id)?.name),field("Notes",s.notes,"notes"),
    field("Status",s.status,"status"),field("Year",s.current_year,"current_year")],8);
  for(const l of DATA?.lessons||[])add("Lesson",l.id,lessonTitle(l),
   Number(l.is_current)===1?"Current":"Needs updating","courses","editlesson",
   [field("Course",course(l.course_id)?.name),field("Number","Year "+l.year+" Lesson "+l.lesson_number),
    field("Scripture reference",l.memory_verse_reference,"memory_verse_reference"),
    field("Memory verse",l.memory_verse_text,"memory_verse_text"),
    field("Bible instructions",l.bible_instruction,"bible_instruction"),
    field("Assignment instructions",l.assignment_instructions,"assignment_instructions"),
    field("Books and materials",l.materials_list,"materials_list"),
    field("Submission notes",l.submission_notes,"submission_notes"),
    field("Status",Number(l.is_current)===1?"Current":"Needs updating")],6);
  for(const a of DATA?.assignments||[]){
   const s=student(a.student_id),l=lesson(a.lesson_id);
   add("Assignment",a.id,a.title,(s?.full_name||"Student")+" · "+(l?lessonTitle(l):"Custom assignment")+" · "+a.status,
    "assignments","grade",[field("Title",a.title),field("Student",s?.full_name),
     field("Course",l?course(l.course_id)?.name:""),field("Status",a.status),
     field("Due",a.due_date),field("Feedback",a.feedback),field("Grade",a.grade_points)],5);
  }
  for(const s of DATA?.submissions||[]){
   const a=assignment(s.assignment_id),person=student(a?.student_id);
   if(!a)continue;
   const fields=[field("Student",person?.full_name),field("Assignment",a.title),field("Written response",s.response_text)];
   let act={};try{act=typeof s.activity_form_json==="string"?JSON.parse(s.activity_form_json||"{}"):s.activity_form_json||{}}catch{}
   if(act&&typeof act==="object"&&!Array.isArray(act))
    for(const [k,v] of Object.entries(act))fields.push(field("Activity: "+k.replace(/_/g," "),v));
   add("Student submission",a.id,a.title,(person?.full_name||"Student")+" · Submitted work","grading","grade",fields,2);
  }
  for(const f of DATA?.files||[]){
   const a=assignment(f.assignment_id);
   if(!a)continue;
   add("Attachment",a.id,f.filename,(student(a.student_id)?.full_name||"Student")+" · "+a.title,
    "grading","grade",[field("Filename",f.filename),field("Student",student(a.student_id)?.full_name),field("Assignment",a.title)],2);
  }
  for(const s of staff)add("Staff",s.id,s.name,s.role+" · "+s.email,"staff","directory",
   [field("Name",s.name),field("Email",s.email),field("Role",s.role)],4);
  return out;
 };
 function formatHit(item,q,terms){
  const combined=clean([item.type,item.title,item.detail,...item.fields.map(f=>f.label+" "+f.value)].join(" "));
  if(!terms.every(t=>combined.includes(t)))return null;
  const title=clean(item.title),query=clean(q);
  const rank=item.weight+(title===query?100:title.startsWith(query)?65:title.includes(query)?40:0);
  const match=item.fields.find(f=>clean(f.value).includes(query))||
   item.fields.find(f=>terms.some(t=>clean(f.value).includes(t)))||item.fields[0];
  return {...item,rank,match};
 }
 function colored(str,q){
  const s=text(str),norm=clean(s),query=clean(q);
  let p=norm.indexOf(query),len=query.length;
  if(p<0){const w=query.split(/\s+/).find(Boolean)||"";p=norm.indexOf(w);len=w.length;}
  return p<0?esc(s):esc(s.slice(0,p))+"<mark>"+esc(s.slice(p,p+len))+"</mark>"+esc(s.slice(p+len));
 }
 function snippet(str,q){
  const s=text(str).replace(/\s+/g," ").trim(),norm=clean(s),query=clean(q);
  let p=norm.indexOf(query);
  if(p<0)p=norm.indexOf(query.split(/\s+/)[0]||"");
  const start=Math.max(0,(p<0?0:p)-43);
  return (start?"…":"")+s.slice(start,start+145)+(s.length>start+145?"…":"");
 }
 function hide(){box.hidden=true;input.setAttribute("aria-expanded","false");input.removeAttribute("aria-activedescendant");chosen=-1;}
 function show(){
  const q=input.value.trim();
  if(q.length<2){matches=[];box.innerHTML='<div class="mti-find-none">Type at least two characters to search all MTI records.</div>';box.hidden=false;input.setAttribute("aria-expanded","true");return;}
  const terms=clean(q).split(/\s+/).filter(Boolean);
  const found=index().map(i=>formatHit(i,q,terms)).filter(Boolean).sort((a,b)=>b.rank-a.rank||a.title.localeCompare(b.title));
  matches=found.slice(0,65);chosen=-1;
  box.innerHTML='<div class="mti-find-meta">'+(found.length?found.length+" matching record"+(found.length===1?"":"s"):"No matching records")+
   (found.length>65?" · Showing first 65; refine your search.":"")+'</div>'+
   '<div class="mti-find-scroll">'+(matches.length?matches.map((r,i)=>'<button type="button" role="option" aria-selected="false" class="mti-find-hit" id="mtiFindHit'+i+'" data-mti-hit="'+i+'">'+
     '<span class="mti-find-tag">'+esc(r.type)+'</span><strong>'+colored(r.title,q)+'</strong>'+
     '<div class="mti-find-sub">'+esc(r.detail)+'</div>'+
     (r.match?.value?'<div class="mti-find-preview">'+esc(r.match.label)+': '+colored(snippet(r.match.value,q),q)+'</div>':"")+
     '</button>').join(""):'<div class="mti-find-none">No results. Try a book title, author, student, scripture or assignment keyword.</div>')+'</div>';
  box.hidden=false;input.setAttribute("aria-expanded","true");input.removeAttribute("aria-activedescendant");
 }
 function active(i){
  chosen=i;
  box.querySelectorAll("[data-mti-hit]").forEach((b,n)=>{
   b.setAttribute("aria-selected",String(i===n));
   if(i===n){b.scrollIntoView({block:"nearest"});input.setAttribute("aria-activedescendant",b.id);}
  });
 }
 async function visit(i){
  const r=matches[i];if(!r)return;
  const query=input.value.trim();hide();input.value="";
  if(r.form==="directory"){
   switchTab("staff");if(typeof loadStaff==="function")await loadStaff();
   const rows=[...document.querySelectorAll("#staffTable tbody tr")];
   const tr=rows.find(x=>lower(x.textContent).includes(lower(r.title)));
   if(tr){tr.style.background="#eaf3ff";tr.scrollIntoView({block:"center",behavior:"smooth"});}
   return;
  }
  switchTab(r.tab);openForm(r.form,r.id);
  if(r.match?.key){
   const element=document.getElementById("f_"+r.match.key);
   if(element){
    element.scrollIntoView({block:"center",behavior:"smooth"});element.focus({preventScroll:true});
    const c=clean(element.value),q=clean(query);
    let p=c.indexOf(q),size=q.length;
    if(p<0){const word=q.split(/\s+/).find(w=>w&&c.includes(w));if(word){p=c.indexOf(word);size=word.length;}}
    if(p>=0&&typeof element.setSelectionRange==="function")element.setSelectionRange(p,p+size);
   }
  }
 }
 function fetchStaff(){
  if(staffLoaded||staffLoading||!ACCOUNT||!["owner","admin"].includes(ACCOUNT.role))return;
  staffLoading=true;
  api("/api/admin/accounts").then(data=>{
   staff=(data.accounts||[]).filter(a=>["owner","admin","teacher"].includes(a.role));
   staffLoaded=true;if(!box.hidden)show();
  }).catch(()=>{}).finally(()=>{staffLoading=false});
 }
 input.addEventListener("focus",()=>{if(app.classList.contains("hidden"))return;fetchStaff();show();});
 input.addEventListener("input",show);
 input.addEventListener("keydown",e=>{
  if(e.key==="Escape"){e.preventDefault();hide();input.blur();}
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(box.hidden)show();if(matches.length)active((chosen+(e.key==="ArrowDown"?1:-1)+matches.length)%matches.length);}
  if(e.key==="Enter"&&!box.hidden&&matches.length){e.preventDefault();visit(chosen<0?0:chosen);}
 });
 box.addEventListener("click",e=>{const b=e.target.closest("[data-mti-hit]");if(b)visit(Number(b.dataset.mtiHit));});
 document.addEventListener("click",e=>{if(!shell.contains(e.target))hide()});
 document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"&&!app.classList.contains("hidden")){e.preventDefault();input.focus();input.select();}
 });
})();