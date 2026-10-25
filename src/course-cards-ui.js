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
 '#mtiCategoryCatalog .mti-groups{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:start}'+
 '#mtiCategoryCatalog details{background:#fff;border:1px solid #e0e9e3;border-radius:12px;overflow:hidden;min-width:0}'+
 '#mtiCategoryCatalog details[open]{box-shadow:0 8px 28px rgba(20,58,42,.065)}'+
 '#mtiCategoryCatalog summary{list-style:none;cursor:pointer;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}'+
 '#mtiCategoryCatalog summary::-webkit-details-marker{display:none}'+
 '#mtiCategoryCatalog summary:focus-visible{outline:2px solid #648c7b;outline-offset:-3px}'+
 '#mtiCategoryCatalog .mti-category[open]{grid-column:1/-1;border-color:#c3d9ca}'+
 '#mtiCategoryCatalog .mti-category[open]>summary{background:#f6faf7;border-bottom:1px solid #dfebe3}'+
 '#mtiCategoryCatalog .mti-course-list{padding:0 10px 11px}'+
 '#mtiCategoryCatalog .mti-category[open]>.mti-course-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr));gap:12px;padding:14px}'+
 '#mtiCategoryCatalog .mti-course{border:1px solid #dce7e0;margin:9px 0 0;border-radius:10px}'+
 '#mtiCategoryCatalog .mti-category[open] .mti-course{margin:0}'+
 '#mtiCategoryCatalog .mti-category[open] .mti-course[open]{grid-column:1/-1;border-color:#b8d5c3}'+
 '#mtiCategoryCatalog .mti-course>summary{padding:14px 16px;font-size:13px;background:#fff}'+
 '#mtiCategoryCatalog .mti-course[open]>summary{background:#f9fbf9;border-bottom:1px solid #e4ede7}'+
 '#mtiCategoryCatalog .mti-course-headline{display:flex;align-items:center;gap:11px;flex-wrap:wrap}'+
 '#mtiCategoryCatalog .mti-course-progress{padding:4px 8px;background:#eaf4ec;border:1px solid #d2e4d5;border-radius:6px;font-size:11px;color:#3c664f;font-weight:700}'+
 '#mtiCategoryCatalog .mti-course-tools{padding:11px 16px;border-bottom:1px solid #e5ece7}'+
 '#mtiCategoryCatalog .mti-year{border:0;border-top:1px solid #e6ede7;border-radius:0;margin:0;box-shadow:none!important}'+
 '#mtiCategoryCatalog .mti-year summary{padding:13px 16px;background:#f6f9f6;font-size:12px}'+
 '#mtiCategoryCatalog .mti-year[open]>summary{border-bottom:1px solid #e1e9e3}'+
 '#mtiCategoryCatalog .mti-lessons{padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:11px;align-items:stretch}'+
 '#mtiCategoryCatalog .mti-session{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:16px;padding:14px 16px;font-size:12px;min-width:0;border-radius:10px}'+
 '#mtiCategoryCatalog .mti-session.mti-needs-update{background:#fff3f3;border:1px solid #efced1}'+
 '#mtiCategoryCatalog .mti-session.mti-is-current{background:#edf5ff;border:1px solid #c4d8f3}'+
 '#mtiCategoryCatalog .mti-session-details{display:flex;flex-direction:column;gap:7px;min-width:0}'+
 '#mtiCategoryCatalog .mti-session-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;min-width:0}'+
 '#mtiCategoryCatalog .mti-session-name{font-size:13px;white-space:nowrap;color:#18362e}'+
 '#mtiCategoryCatalog .mti-session .mti-review-pill{display:inline-flex;align-items:center;border-radius:6px;padding:4px 8px;font-size:10px;font-weight:800;line-height:1.2}'+
 '#mtiCategoryCatalog .mti-needs-update .mti-review-pill{background:#f8dfe2;color:#923d4a}'+
 '#mtiCategoryCatalog .mti-is-current .mti-review-pill{background:#dcecff;color:#245485}'+
 '#mtiCategoryCatalog .mti-needs-counter{color:#a14853;font-weight:700}'+
 '#mtiCategoryCatalog .mti-link{background:#fff;border:1px solid #cdded4;border-radius:7px;padding:9px 12px;font-size:11px;white-space:nowrap;cursor:pointer;color:#24463a;font-weight:700}'+
 '#mtiCategoryCatalog .mti-link:hover{background:#f0f7f2;border-color:#9abca5}'+
 '#mtiCategoryCatalog .mti-session-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}'+
 '#mtiCategoryCatalog .mti-print-button{background:#e7f2ea;border-color:#a7c9b1;color:#194838}'+
 '#mtiCategoryCatalog .mti-muted{color:#6b8176;font-size:11px;line-height:1.5}'+
 '@media(max-width:1100px){#mtiCategoryCatalog .mti-groups{grid-template-columns:repeat(2,minmax(0,1fr))}}'+
 '@media(max-width:660px){#mtiCategoryCatalog .mti-groups{grid-template-columns:1fr}#mtiCategoryCatalog .mti-lessons{grid-template-columns:1fr}#mtiCategoryCatalog .mti-session{grid-template-columns:1fr;gap:12px}#mtiCategoryCatalog .mti-session-actions{justify-content:flex-start}#mtiCategoryCatalog .mti-category[open]>.mti-course-list{grid-template-columns:1fr}}'+
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
     '<div class="mti-session '+(Number(l.is_current)===1?'mti-is-current':'mti-needs-update')+'"><div class="mti-session-details"><div class="mti-session-top"><strong class="mti-session-name">Session '+esc(l.lesson_number)+'</strong><span class="mti-review-pill">'+(Number(l.is_current)===1?'Current':'Needs updating')+'</span></div><span class="mti-muted">'+esc(l.memory_verse_reference||"Study materials")+' · '+esc(l.credits)+' credits</span></div>'+
     '<div class="mti-session-actions"><button type="button" class="mti-link" data-course-action="lesson" data-course-id="'+esc(l.id)+'">Edit lesson</button><button type="button" class="mti-link mti-print-button" data-course-action="print" data-course-id="'+esc(l.id)+'">Print</button></div></div>').join("")+'</div></details>';
   }).join("");
   const currentCount=courseLessons.filter(l=>Number(l.is_current)===1).length;
   return '<details class="mti-course"><summary><span class="mti-course-headline"><strong>'+esc(c.name)+'</strong><span class="mti-course-progress">'+currentCount+' / '+courseLessons.length+' current</span></span><span>⌄</span></summary>'+
   '<div class="mti-course-tools"><button type="button" class="mti-link" data-course-action="course" data-course-id="'+esc(c.id)+'">Edit course details</button></div>'+tree+'</details>';
  }).join("");
  return '<details class="mti-category" '+(query?'open':'')+'><summary><span style="display:flex;align-items:center;gap:11px"><span style="display:grid;place-items:center;width:37px;height:37px;border-radius:9px;background:#edf2ee;font-size:17px">'+group.icon+'</span><span><strong>'+esc(group.name)+'</strong><span class="mti-muted" style="display:block">'+group.courses.length+' courses · '+total+' lessons</span></span></span><span>⌄</span></summary><div class="mti-course-list">'+cards+'</div></details>';
 }).join("");
 elRoot.innerHTML=style+(groups.length?'<div class="mti-groups">'+content+'</div>':'<div class="empty">No matching courses. Try another search.</div>');
}
const mtiBeforeRender=render;
render=function(){mtiBeforeRender();renderCourseNavigator()};
renderCourseNavigator();
