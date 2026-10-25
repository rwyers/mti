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

/* Print one clean lesson/marking cover followed by the two existing activity sheets. */
function printMtiLesson(id){
 const lesson=DATA.lessons.find(l=>String(l.id)===String(id));
 if(!lesson){alert("Lesson not found. Refresh the page and try again.");return;}
 const course=DATA.courses.find(c=>String(c.id)===String(lesson.course_id));
 const title=(course?.name||"MTI Course")+" — Year "+lesson.year+" Lesson "+lesson.lesson_number;
 const cover=mtiLessonPrintCoverHtml({
  course:course?.name||"MTI Course",
  year:lesson.year,lesson:lesson.lesson_number,credits:lesson.credits,
  verseRef:lesson.memory_verse_reference,verseText:lesson.memory_verse_text,
  bible:lesson.bible_instruction,assignment:lesson.assignment_instructions,
  materials:lesson.materials_list
 });
 const documentHtml='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(title)+'</title>'+
  '<style>'+
  '@page{size:letter;margin:.6in}*{box-sizing:border-box}body{margin:0;background:#edf2ee;color:#1a3327;font:12px/1.45 Arial,Helvetica,sans-serif}'+
  '.print-tools{max-width:850px;margin:18px auto 10px;display:flex;justify-content:space-between;align-items:center;gap:12px;font:14px Arial,Helvetica,sans-serif}'+
  '.print-tools button{background:#22533c;color:white;border:0;border-radius:8px;padding:11px 18px;font-weight:750;cursor:pointer}'+
  'main{max-width:850px;background:white;margin:12px auto 40px;padding:25px;box-shadow:0 8px 30px #152c1d12}'+
  '@media print{body{background:#fff!important}main{max-width:none!important;padding:0!important;margin:0!important;box-shadow:none!important}.print-tools{display:none!important}'+
  '.mti-cover-page{height:9.25in!important}'+
  '}'+
  '</style></head><body>'+
  '<div class="print-tools"><strong>MTI · Lesson &amp; grading sheet</strong><button type="button" id="mtiPrintNow">Print / Save PDF</button></div>'+
  '<main>'+cover+mtiActivityPrintHtml({})+'</main></body></html>';
 const win=window.open("","_blank");
 if(!win){alert("Your browser blocked the print window. Allow pop-ups for MTI and try again.");return;}
 win.document.open();win.document.write(documentHtml);win.document.close();
 const scaleCover=()=>mtiFitLessonPrintCover(win.document.querySelector(".mti-cover-page"));
 const doPrint=()=>{scaleCover();win.focus();win.print();};
 win.document.getElementById("mtiPrintNow").addEventListener("click",doPrint);
 win.addEventListener("beforeprint",scaleCover);
 if(win.document.readyState==="complete")doPrint();
 else win.addEventListener("load",doPrint,{once:true});
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
