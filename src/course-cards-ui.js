/* MTI compact admin curriculum library.
 * Categories > Courses > Years > individual session edit tools.
 * Existing data and editor forms are reused. No endless flat lesson tables.
 */
(function initCourseNavigator(){
 const page=document.getElementById("page-courses");
 const table=document.getElementById("courseTable"),lessons=document.getElementById("lessonTable");
 if(!page||!table||!lessons)return;
 table.closest(".panel").style.display="none";
 lessons.closest(".panel").style.display="none";
 const box=document.createElement("div");box.className="panel";box.id="mtiCatalogPanel";
 box.innerHTML='<div class="panel-head" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap"><div><h2>MTI curriculum library</h2><p>Choose a category, course and year to edit just the lessons you need.</p></div>'+
 '<input type="search" id="mtiCourseSearch" style="max-width:295px;padding:11px" placeholder="Search courses or lesson numbers…" aria-label="Search courses"></div>'+
 '<div id="mtiCategoryCatalog" style="padding:18px"></div>';
 page.appendChild(box);
 box.querySelector("#mtiCourseSearch").addEventListener("input",renderCourseNavigator);
 box.querySelector("#mtiCategoryCatalog").addEventListener("click",function(event){
  const button=event.target.closest("button[data-course-action]");if(!button)return;
  event.preventDefault();
  const id=button.dataset.courseId;
  if(button.dataset.courseAction==="course")openForm("editcourse",id);
  if(button.dataset.courseAction==="lesson")openForm("editlesson",id);
  if(button.dataset.courseAction==="print")printMtiLesson(id);
 });
})();

/* Print a standalone copy of any curriculum lesson, without a student login or assignment. */
function printMtiLesson(id){
 const lesson=DATA.lessons.find(l=>String(l.id)===String(id));
 if(!lesson){alert("Lesson not found. Refresh the page and try again.");return;}
 const course=DATA.courses.find(c=>String(c.id)===String(lesson.course_id));
 const safe=value=>esc(value==null?"":value);
 const section=(label,value)=>String(value==null?"":value).trim()?
  '<section class="lesson-section"><h2>'+safe(label)+'</h2><div class="lesson-copy">'+safe(value)+'</div></section>':"";
 const scripture=lesson.memory_verse_reference||lesson.memory_verse_text?
  '<section class="lesson-section"><h2>Scripture to memorize</h2>'+
  (lesson.memory_verse_reference?'<p class="scripture-ref">'+safe(lesson.memory_verse_reference)+'</p>':"")+
  (lesson.memory_verse_text?'<div class="lesson-copy">'+safe(lesson.memory_verse_text)+'</div>':"")+
  '</section>':"";
 const title=(course?.name||"MTI Course")+' — Year '+lesson.year+' Lesson '+lesson.lesson_number;
 const responseLines=Array.from({length:8},()=>'<div class="writing-line"></div>').join("");
 const documentHtml='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>'+safe(title)+'</title>'+
  '<style>'+
  '@page{size:letter;margin:.7in}*{box-sizing:border-box}body{margin:0;background:#f1f4f2;color:#1b2924;font:12pt/1.5 Arial,Helvetica,sans-serif}'+
  '.print-tools{max-width:820px;margin:18px auto 0;display:flex;justify-content:space-between;align-items:center;gap:12px;font:14px Arial,Helvetica,sans-serif}'+
  '.print-tools button{background:#1e5341;color:white;border:0;border-radius:8px;padding:10px 18px;font-weight:700;cursor:pointer}'+
  'main{max-width:820px;background:white;margin:14px auto 45px;padding:48px;box-shadow:0 7px 32px #0001}'+
  '.brand{text-transform:uppercase;letter-spacing:2px;font-size:11pt;font-weight:700;color:#325f4f}'+
  'h1{font-size:21pt;line-height:1.2;margin:8px 0 12px}'+
  '.metadata{display:flex;flex-wrap:wrap;gap:10px 24px;font-size:10.5pt;color:#4c5a54;margin-bottom:22px}'+
  '.student-fields{border-top:1px solid #aebdb5;border-bottom:1px solid #aebdb5;padding:13px 0;display:flex;gap:32px;font-size:11pt;margin-bottom:24px}'+
  '.student-fields span{flex:1}.blank{display:inline-block;border-bottom:1px solid #88998f;width:70%;height:1em;vertical-align:bottom}'+
  '.lesson-section{margin:0 0 23px;break-inside:avoid-page}h2{font-size:13pt;margin:0 0 8px;color:#244d3e;border-bottom:1px solid #d7e3dc;padding-bottom:4px}'+
  '.lesson-copy{white-space:pre-wrap;overflow-wrap:anywhere}.scripture-ref{font-weight:700;margin:4px 0 6px}'+
  '.writing-line{height:28px;border-bottom:1px solid #cbd7d0}'+
  '.paper-note{margin:25px 0 0;color:#64736b;font-size:9pt}'+
  '@media(max-width:650px){main{margin:12px;padding:25px}.print-tools{margin:12px;padding:0 12px}.student-fields{gap:12px;flex-direction:column}.blank{width:65%}}'+
  '@media print{body{background:white}main{margin:0;max-width:none;padding:0;box-shadow:none}.print-tools{display:none!important}.lesson-section{break-inside:avoid-page}.paper-note{color:#444}}'+
  '</style></head><body>'+
  '<div class="print-tools"><strong>MTI printable lesson</strong><button type="button" id="mtiPrintNow">Print / Save PDF</button></div>'+
  '<main><header><div class="brand">Ministry Training Institute</div><h1>'+safe(course?.name||"MTI Course")+'</h1>'+
  '<div class="metadata"><span>Year '+safe(lesson.year)+' · Lesson '+safe(lesson.lesson_number)+'</span><span>Credits: '+safe(lesson.credits)+'</span></div></header>'+
  '<div class="student-fields"><span>Student: <i class="blank"></i></span><span>Date: <i class="blank"></i></span></div>'+
  scripture+
  section("Bible study",lesson.bible_instruction)+
  section("Lesson assignment",lesson.assignment_instructions)+
  section("Required materials",lesson.materials_list)+

  '<section class="lesson-section"><h2>Student responses / notes</h2>'+responseLines+'</section>'+
  mtiOfficeGradingPrintHtml()+
  mtiActivityPrintHtml({})+'</main></body></html>';
 const printWindow=window.open("","_blank");
 if(!printWindow){alert("Your browser blocked the print window. Allow pop-ups for MTI and try again.");return;}
 printWindow.document.open();
 printWindow.document.write(documentHtml);
 printWindow.document.close();
 printWindow.document.getElementById("mtiPrintNow").addEventListener("click",function(){printWindow.focus();printWindow.print()});
 if(printWindow.document.readyState==="complete"){printWindow.focus();printWindow.print();}
 else printWindow.addEventListener("load",function(){printWindow.focus();printWindow.print()},{once:true});
}

function mtiGroupName(name){
 const n=String(name||"").toLowerCase();
 if(n.includes("counsel"))return "Counseling";
 if(n.includes("pastoral")||n.includes("leadership")||n.includes("five fold")||n.includes("5 fold"))return "Leadership & Pastoral";
 if(n.includes("mission"))return "Missions";
 if(n.includes("music")||n.includes("creative"))return "Creative Arts";
 if(n.includes("business")||n.includes("working")||n.includes("busy"))return "Business & Workplace";
 if(n.includes("new believer")||n.includes("alumni")||n.includes("discipleship"))return "Foundations & Alumni";
 return "Other Programs";
}
const MTI_GROUPS=[
 {name:"Leadership & Pastoral",icon:"✦"},
 {name:"Counseling",icon:"♡"},
 {name:"Missions",icon:"◎"},
 {name:"Creative Arts",icon:"♫"},
 {name:"Business & Workplace",icon:"⌂"},
 {name:"Foundations & Alumni",icon:"❖"},
 {name:"Other Programs",icon:"▣"}
];
function renderCourseNavigator(){
 const elRoot=document.getElementById("mtiCategoryCatalog");
 if(!elRoot||!DATA?.courses)return;
 const query=(document.getElementById("mtiCourseSearch")?.value||"").trim().toLowerCase();
 const groups=MTI_GROUPS.map(g=>({...g,courses:DATA.courses.filter(c=>mtiGroupName(c.name)===g.name&&(!query||c.name.toLowerCase().includes(query)||DATA.lessons.some(l=>l.course_id===c.id&&("year "+l.year+" lesson "+l.lesson_number).includes(query))))})).filter(g=>g.courses.length);
 const style='<style>'+
 '#mtiCategoryCatalog .mti-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}'+
 '#mtiCategoryCatalog details{background:#fff;border:1px solid #e1e9e2;border-radius:11px;overflow:hidden}'+
 '#mtiCategoryCatalog details[open]{box-shadow:0 10px 32px rgba(17,56,52,.07)}'+
 '#mtiCategoryCatalog summary{list-style:none;cursor:pointer;padding:17px;display:flex;align-items:center;justify-content:space-between;gap:10px}'+
 '#mtiCategoryCatalog summary::-webkit-details-marker{display:none}'+
 '#mtiCategoryCatalog summary:focus-visible{outline:2px solid #7da38c}'+
 '#mtiCategoryCatalog .mti-course{border:1px solid #e3eae4;margin:9px;border-radius:8px}'+
 '#mtiCategoryCatalog .mti-course summary{padding:12px;font-size:13px}'+
 '#mtiCategoryCatalog .mti-year{border:0;border-top:1px solid #e9eee9;border-radius:0;margin:0}'+
 '#mtiCategoryCatalog .mti-year summary{padding:11px 15px;background:#f7faf7;font-size:12px}'+
 '#mtiCategoryCatalog .mti-lessons{padding:9px 14px}'+
 '#mtiCategoryCatalog .mti-session{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid #ecf1ed;gap:8px;font-size:12px}'+
 '#mtiCategoryCatalog .mti-session:last-child{border-bottom:0}'+
 '#mtiCategoryCatalog .mti-session.mti-needs-update{background:#fff0f1;border:1px solid #f1c6ca;border-radius:9px;padding:11px 12px;margin:7px 0}'+
 '#mtiCategoryCatalog .mti-session.mti-is-current{background:#eaf3ff;border:1px solid #bad5f7;border-radius:9px;padding:11px 12px;margin:7px 0}'+
 '#mtiCategoryCatalog .mti-session .mti-review-pill{display:inline-block;border-radius:5px;padding:3px 7px;margin-left:7px;font-size:10px;font-weight:800;vertical-align:middle}'+
 '#mtiCategoryCatalog .mti-needs-update .mti-review-pill{background:#f9dbde;color:#963d46}'+
 '#mtiCategoryCatalog .mti-is-current .mti-review-pill{background:#d8eaff;color:#20558c}'+
 '#mtiCategoryCatalog .mti-needs-counter{color:#a14853;font-weight:700}'+
 '#mtiCategoryCatalog .mti-link{background:#fff;border:1px solid #d6e3dd;border-radius:7px;padding:7px 10px;font-size:11px;white-space:nowrap;cursor:pointer;color:#234c53}'+
 '#mtiCategoryCatalog .mti-session-actions{display:flex;align-items:center;gap:7px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}'+
 '#mtiCategoryCatalog .mti-print-button{background:#edf5ef;border-color:#aac9b6;color:#194838;font-weight:600}'+
 '#mtiCategoryCatalog .mti-muted{color:#80938f;font-size:11px}'+
 '</style>';
 const content=groups.map(group=>{
  const total=group.courses.reduce((n,c)=>n+DATA.lessons.filter(l=>l.course_id===c.id).length,0);
  const cards=group.courses.sort((a,b)=>a.name.localeCompare(b.name)).map(c=>{
   const courseLessons=DATA.lessons.filter(l=>l.course_id===c.id);
   const years=[...new Set(courseLessons.map(l=>Number(l.year)))].sort((a,b)=>a-b);
   const tree=years.map(y=>{
    const ll=courseLessons.filter(l=>Number(l.year)===y).sort((a,b)=>Number(a.lesson_number)-Number(b.lesson_number));
    const needsReview=ll.filter(l=>Number(l.is_current)!==1).length;
    return '<details class="mti-year"><summary><strong>Year '+y+'</strong><span class="mti-muted">'+ll.length+' sessions · '+(needsReview?'<span class="mti-needs-counter">'+needsReview+' need updating</span>':'All current')+' ⌄</span></summary><div class="mti-lessons">'+ll.map(l=>
     '<div class="mti-session '+(Number(l.is_current)===1?'mti-is-current':'mti-needs-update')+'"><span><strong>Session '+esc(l.lesson_number)+'</strong><span class="mti-review-pill">'+(Number(l.is_current)===1?'Current':'Needs updating')+'</span><br><span class="mti-muted">'+esc(l.memory_verse_reference||"Study materials")+' · '+esc(l.credits)+' credits</span></span>'+
     '<div class="mti-session-actions"><button type="button" class="mti-link" data-course-action="lesson" data-course-id="'+esc(l.id)+'">Edit lesson</button><button type="button" class="mti-link mti-print-button" data-course-action="print" data-course-id="'+esc(l.id)+'">Print</button></div></div>').join("")+'</div></details>';
   }).join("");
   const currentCount=courseLessons.filter(l=>Number(l.is_current)===1).length;
   return '<details class="mti-course"><summary><span><strong>'+esc(c.name)+'</strong><span class="mti-muted" style="display:block">'+years.length+' year(s) · '+currentCount+'/'+courseLessons.length+' current</span></span><span>⌄</span></summary>'+
   '<div style="padding:0 11px 11px"><button type="button" class="mti-link" data-course-action="course" data-course-id="'+esc(c.id)+'">Edit course details</button></div>'+tree+'</details>';
  }).join("");
  return '<details class="mti-category" '+(query?'open':'')+'><summary><span style="display:flex;align-items:center;gap:11px"><span style="display:grid;place-items:center;width:37px;height:37px;border-radius:9px;background:#edf2ee;font-size:17px">'+group.icon+'</span><span><strong>'+esc(group.name)+'</strong><span class="mti-muted" style="display:block">'+group.courses.length+' courses · '+total+' lessons</span></span></span><span>⌄</span></summary><div style="padding:0 2px 7px">'+cards+'</div></details>';
 }).join("");
 elRoot.innerHTML=style+(groups.length?'<div class="mti-groups">'+content+'</div>':'<div class="empty">No matching courses. Try another search.</div>');
}
const mtiBeforeRender=render;
render=function(){mtiBeforeRender();renderCourseNavigator()};
renderCourseNavigator();
