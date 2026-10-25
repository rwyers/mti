/* MTI lesson activity record. Mirrors the reverse side of the MTI paper assignment sheet. */
const MTI_ACTIVITY_SECTIONS=[
 {title:"One Hour of Practical Service",note:"Approved by Pastors Don & Tabatha Laing or Leslie Wyers.",rows:[
  [{key:"service_what",label:"What"},{key:"service_when",label:"When"},{key:"service_where",label:"Where"}],
  [{key:"service_approved",label:"Approved by (name / handwritten signature when printed)"}]
 ]},
 {title:"Personal Evangelism",note:"Invited 5 people personally to church in the last 6 weeks. List their names.",rows:
  Array.from({length:5},(_,i)=>[{key:"evangelism_"+(i+1),label:"Person "+(i+1)}])},
 {title:"Confessions",note:"Write out 9 confessions, including scripture references from Champion Confessions by Dr. Carmen Lynne, that you spoke out loud in the last 6 weeks.",rows:[
  [{key:"confessions",label:"Nine confessions and scripture references",multiline:true,lines:9}]
 ]},
 {title:"Attendance — Sunday Services",note:"List the theme of each Sunday service you attended and how it personally applied to your life.",rows:
  Array.from({length:6},(_,i)=>[
   {key:"sunday_"+(i+1)+"_date",label:"Service "+(i+1)+" — Date"},
   {key:"sunday_"+(i+1)+"_theme",label:"Theme"},
   {key:"sunday_"+(i+1)+"_application",label:"Personal application",multiline:true,lines:2}
  ])},
 {title:"MTI Study Night",note:"Write down one thing you learnt and how you will apply it to your life.",rows:[
  [{key:"study_date",label:"Date"},{key:"study_taught",label:"What was taught",multiline:true,lines:2}],
  [{key:"study_application",label:"How I will apply it",multiline:true,lines:2}]
 ]},
 {title:"Small Group / Worship Encounter",note:"For each meeting, write one thing you learnt and how it personally applied to your Christian walk.",rows:
  Array.from({length:6},(_,i)=>[
   {key:"small_"+(i+1)+"_date",label:"Meeting "+(i+1)+" — Date"},
   {key:"small_"+(i+1)+"_taught",label:"What was taught",multiline:true,lines:2},
   {key:"small_"+(i+1)+"_application",label:"Personal application",multiline:true,lines:2}
  ])},
 {title:"Spiritual Intensive Night",note:"Record the date and what was taught.",rows:[
  [{key:"intensive_date",label:"Date"},{key:"intensive_taught",label:"What was taught",multiline:true,lines:2}]
 ]},
 {title:"Mentorship Assignment",note:"Record the date and the mentorship signature or confirmation.",rows:[
  [{key:"mentorship_date",label:"Date"},{key:"mentorship_signature",label:"Mentor signature / confirmation"}]
 ]}
];
function mtiActivityEscape(value){
 return String(value==null?"":value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function mtiActivityData(raw){
 if(raw&&typeof raw==="object"&&!Array.isArray(raw))return raw;
 try{const data=JSON.parse(raw||"{}");return data&&typeof data==="object"&&!Array.isArray(data)?data:{}}
 catch{return {}}
}
function mtiActivityAny(raw){return Object.values(mtiActivityData(raw)).some(v=>typeof v==="string"&&v.trim())}
const MTI_ACTIVITY_CSS='<style>'+
'.mti-activity-record{margin:25px 0;color:#273a31}'+
'.mti-activity-record h3{font-size:17px;margin:0 0 6px}'+
'.mti-activity-record .mti-act-section{padding:16px 0;border-bottom:1px solid #dce6de}'+
'.mti-activity-record .mti-act-section h4{font-size:14px;margin:0 0 4px;color:#255441}'+
'.mti-activity-record .mti-act-note{font-size:12px;color:#65746c;margin:0 0 10px;line-height:1.5}'+
'.mti-activity-record .mti-act-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:12px 0}'+
'.mti-activity-record label{display:block;font-size:12px;font-weight:650;margin-bottom:4px}'+
'.mti-activity-record input,.mti-activity-record textarea{display:block;width:100%;font:14px/1.45 inherit;color:#20332a;border:1px solid #cddbd0;border-radius:7px;padding:10px;background:white;box-sizing:border-box}'+
'.mti-activity-record textarea{resize:vertical;min-height:74px}'+
'.mti-activity-record .mti-act-value{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.5;padding:6px 0}'+
'.mti-activity-record .mti-act-print-value{white-space:pre-wrap;overflow-wrap:anywhere;border-bottom:1px solid #b0beb4;min-height:22px;padding:3px 0;font-size:11pt}'+
'.mti-activity-record .mti-act-print-row{break-inside:avoid-page;page-break-inside:avoid;margin:8px 0}'+
'.mti-activity-record .mti-act-blank{display:block;height:21px;border-bottom:1px solid #cbd4cd}'+
'.mti-activity-record.mti-act-print .mti-act-section{break-inside:auto;page-break-inside:auto}'+
'.mti-activity-record.mti-act-print h4{break-after:avoid-page;page-break-after:avoid}'+
'@media print{.mti-activity-record{color:#000;margin-top:22pt}.mti-activity-record h3{font-size:15pt}.mti-activity-record .mti-act-section{padding:10pt 0;border-color:#bbb}.mti-activity-record .mti-act-note{color:#333}.mti-activity-record .mti-act-print-value{border-color:#999}}'+
'</style>';
function mtiActivityFormHtml(raw){
 const data=mtiActivityData(raw);
 return MTI_ACTIVITY_CSS+'<section class="mti-activity-record" id="mtiActivityOnline">'+
 '<h3>Lesson activity record</h3><p class="mti-act-note">Complete these activities for this lesson. Your entries are submitted with your assignment and visible to your instructor for marking.</p>'+
 MTI_ACTIVITY_SECTIONS.map(section=>
  '<div class="mti-act-section"><h4>'+mtiActivityEscape(section.title)+'</h4><p class="mti-act-note">'+mtiActivityEscape(section.note)+'</p>'+
  section.rows.map(row=>'<div class="mti-act-row">'+row.map(field=>
   '<div><label for="act_'+field.key+'">'+mtiActivityEscape(field.label)+'</label>'+
   (field.multiline?'<textarea id="act_'+field.key+'" data-mti-activity="'+field.key+'" maxlength="900" rows="'+(field.lines===9?7:2)+'">'+mtiActivityEscape(data[field.key]||"")+'</textarea>':
   '<input id="act_'+field.key+'" data-mti-activity="'+field.key+'" maxlength="250" type="text" value="'+mtiActivityEscape(data[field.key]||"")+'">')+
   '</div>').join("")+'</div>').join("")+
  '</div>').join("")
 +'</section>';
}
function mtiActivityCollect(){
 const root=document.getElementById("mtiActivityOnline");if(!root)return null;
 const result={};root.querySelectorAll("[data-mti-activity]").forEach(el=>{
  if(el.value.trim())result[el.getAttribute("data-mti-activity")]=el.value.trim();
 });
 return result;
}
function mtiActivityReadOnlyHtml(raw){
 const data=mtiActivityData(raw);
 if(!mtiActivityAny(data))return '<div class="callout"><strong>Lesson activity record:</strong> No activity entries submitted.</div>';
 return MTI_ACTIVITY_CSS+'<div class="mti-activity-record"><h3>Student lesson activity record — use these entries when marking</h3>'+
 MTI_ACTIVITY_SECTIONS.map(section=>'<section class="mti-act-section"><h4>'+mtiActivityEscape(section.title)+'</h4>'+
  section.rows.map(row=>'<div class="mti-act-row">'+row.map(field=>'<div><label>'+mtiActivityEscape(field.label)+'</label><div class="mti-act-value">'+mtiActivityEscape(data[field.key]||"—")+'</div></div>').join("")+'</div>').join("")+'</section>').join("")+
 '</div>';
}
/* Print-only fallback: two spacious, handwriting-friendly letter sheets.
   Online entry, read-only grading and saved activity fields are unchanged. */
const MTI_HANDWRITING_PRINT_CSS='<style>'+
'.mti-hand-sheet,.mti-hand-sheet *{box-sizing:border-box}'+
'.mti-hand-sheet{background:white;color:#182922;border:1px solid #d9e2dc;max-width:8.1in;margin:24px auto;padding:24px 25px;font:10pt/1.3 Arial,Helvetica,sans-serif}'+
'.mti-hand-sheet .mh-head{display:flex;align-items:start;justify-content:space-between;gap:12px;border-bottom:2px solid #365f49;padding:0 0 9px;margin:0 0 10px}'+
'.mti-hand-sheet h3{font:bold 16pt/1.15 Arial,Helvetica,sans-serif!important;color:#214a37;margin:0 0 3px!important}'+
'.mti-hand-sheet .mh-page{font-weight:700;font-size:9pt;color:#456254}'+
'.mti-hand-sheet .mh-name{font-size:9pt;white-space:nowrap;margin-top:3px;line-height:2}'+
'.mti-hand-sheet .mh-body{display:flex;flex-direction:column;justify-content:space-between;flex:1;min-height:0}'+
'.mti-hand-sheet .mh-section{break-inside:avoid-page;page-break-inside:avoid;margin:0 0 10px}'+
'.mti-hand-sheet h4{font:bold 11pt/1.2 Arial,Helvetica,sans-serif;color:#244c39;border-bottom:1px solid #a8b7aa;margin:0 0 3px;padding-bottom:3px}'+
'.mti-hand-sheet .mh-note{font:8.5pt/1.3 Arial,Helvetica,sans-serif;margin:3px 0 7px;color:#4b6052}'+
'.mti-hand-sheet .mh-line{display:flex;align-items:end;gap:8px;min-width:0;margin:6px 0;font-size:9.2pt}'+
'.mti-hand-sheet .mh-field{display:flex;align-items:baseline;gap:6px;flex:1 1 0;min-width:0}'+
'.mti-hand-sheet .mh-field b{white-space:nowrap;font-size:9pt}'+
'.mti-hand-sheet .mh-answer{flex:1;min-width:0;border-bottom:1px solid #9faea3;min-height:19px;white-space:pre-wrap;overflow-wrap:anywhere;padding-bottom:2px}'+
'.mti-hand-sheet .mh-long-label{font-size:8.7pt;font-weight:700;margin:4px 0 0}'+
'.mti-hand-sheet .mh-rule{display:flex;align-items:end;gap:7px;margin:1px 0;min-height:21px}'+
'.mti-hand-sheet .mh-rule-num{flex:0 0 20px;font-size:9pt;font-weight:700}'+
'.mti-hand-sheet .mh-rule-line{flex:1;border-bottom:1px solid #a6b5aa;min-width:0;min-height:18px}'+
'.mti-hand-sheet .mh-filled{white-space:pre-wrap;overflow-wrap:anywhere;border-bottom:1px solid #a6b5aa;padding:2px 0 5px;font-size:9pt;line-height:1.4}'+
'.mti-hand-sheet .mh-entry{padding:2px 0 5px;border-bottom:1px dotted #d5ded6;break-inside:avoid-page}'+
'.mti-hand-sheet .mh-entry:last-child{border-bottom:0}'+
'.mti-hand-sheet .mh-entry .mh-line{margin:2px 0}'+
'.mti-hand-sheet .mh-entry-title{font-size:8.7pt;font-weight:800;color:#314f3b}'+
'.mti-hand-sheet .mh-footer{padding-top:8px;margin-top:8px;border-top:1px solid #a8b7aa;font-size:8pt;color:#586c60;display:flex;justify-content:space-between}'+
'@media print{'+
'.mti-hand-sheet{break-before:page!important;page-break-before:always!important;break-after:auto;page-break-after:auto;break-inside:avoid-page;page-break-inside:avoid-page;height:9.28in!important;max-height:9.28in!important;max-width:none!important;border:0!important;margin:0!important;padding:0!important;display:flex;flex-direction:column;color:black;font:10pt/1.3 Arial,Helvetica,sans-serif}'+
'.mti-hand-sheet .mh-body{flex:1;min-height:0}'+
'.mti-hand-sheet .mh-note,.mti-hand-sheet .mh-page,.mti-hand-sheet .mh-footer{color:#333}'+
'.mti-hand-sheet .mh-section{margin:0 0 8px}'+
'}</style>';
function mtiActivityPrintHtml(raw){
 const data=mtiActivityData(raw);
 const value=k=>mtiActivityEscape(String(data[k]||"").trim());
 const field=(key,label)=>'<span class="mh-field"><b>'+mtiActivityEscape(label)+':</b><span class="mh-answer">'+(value(key)||'&nbsp;')+'</span></span>';
 const pair=(a,b)=>'<div class="mh-line">'+a+b+'</div>';
 const writing=(key,label,lines=1)=>{
  const text=value(key);
  return '<div class="mh-long-label">'+mtiActivityEscape(label)+'</div>'+
   (text?'<div class="mh-filled">'+text+'</div>':
    Array.from({length:lines},()=>'<div class="mh-rule"><span class="mh-rule-line"></span></div>').join(""));
 };
 const heading=(title,note,body)=>'<section class="mh-section"><h4>'+mtiActivityEscape(title)+'</h4>'+
  (note?'<div class="mh-note">'+mtiActivityEscape(note)+'</div>':"")+body+'</section>';
 const service=heading("One Hour of Practical Service","Service must be approved by Pastors Don & Tabatha Laing or Leslie Wyers.",
  pair(field("service_what","What"),field("service_when","When"))+
  pair(field("service_where","Where"),field("service_approved","Approved by / signature")));
 const evangelism=heading("Personal Evangelism","Write the names of five people you personally invited to church in the last six weeks.",
  Array.from({length:5},(_,i)=>'<div class="mh-rule"><span class="mh-rule-num">'+(i+1)+'.</span>'+
  (value("evangelism_"+(i+1))?'<span class="mh-answer">'+value("evangelism_"+(i+1))+'</span>':'<span class="mh-rule-line"></span>')+'</div>').join(""));
 const confessionText=value("confessions");
 const confessions=heading("Confessions","Write nine confessions with Scripture references from Champion Confessions by Dr. Carmen Lynne that you spoke aloud in the last six weeks. Use extra paper for longer confessions.",
  confessionText?'<div class="mh-filled">'+confessionText+'</div>':
  Array.from({length:9},(_,i)=>'<div class="mh-rule"><span class="mh-rule-num">'+(i+1)+'.</span><span class="mh-rule-line"></span></div>').join(""));
 const attendance=heading("Attendance — Sunday Services","For six Sunday services, note the date, theme and how the message personally applied to your life.",
  Array.from({length:6},(_,i)=>{
   const n=i+1,p="sunday_"+n+"_";
   return '<div class="mh-entry"><div class="mh-entry-title">Sunday '+n+'</div>'+
    pair(field(p+"date","Date"),field(p+"theme","Theme"))+
    writing(p+"application","Personal application",1)+'</div>';
  }).join(""));
 const study=heading("MTI Study Night","Record one thing you learned and how you will apply it.",
  pair(field("study_date","Date"),field("study_taught","What was taught"))+
  writing("study_application","How I will apply it",3));
 const group=heading("Small Group / Worship Encounter","For each of six meetings, write what you learned and how it applies to your Christian walk.",
  Array.from({length:6},(_,i)=>{
   const n=i+1,p="small_"+n+"_";
   return '<div class="mh-entry"><div class="mh-entry-title">Meeting '+n+'</div>'+
    pair(field(p+"date","Date"),field(p+"taught","What was taught"))+
    writing(p+"application","Personal application",2)+'</div>';
  }).join(""));
 const intensive=heading("Spiritual Intensive Night","Record the date and what you learned.",
  pair(field("intensive_date","Date"),field("intensive_taught","What was taught"))+
  '<div class="mh-rule"><span class="mh-rule-line"></span></div>');
 const mentor=heading("Mentorship Assignment","Record the date and obtain your mentor's signature or confirmation.",
  pair(field("mentorship_date","Date"),field("mentorship_signature","Signature / confirmation")));
 const sheet=(n,topic,sections)=>
  '<section class="mti-hand-sheet" aria-label="MTI activity record printable page '+n+' of 2">'+
   '<div class="mh-head"><div><h3>MTI Lesson Activity Record</h3><span class="mh-page">Page '+n+' of 2 · '+topic+'</span></div>'+
   '<div class="mh-name">Student: ______________________<br>Date: ________________________</div></div>'+
   '<div class="mh-body">'+sections+'</div>'+
   '<div class="mh-footer"><span>'+(n===2?'Return completed paper assignment to your MTI instructor.':'Ministry Training Institute · Handwritten activity record')+'</span><span>Page '+n+' / 2</span></div>'+
   '</section>';
 return MTI_HANDWRITING_PRINT_CSS+
  sheet(1,"Service, evangelism, confessions and attendance",service+evangelism+confessions+attendance)+
  sheet(2,"Study nights, groups and mentorship",study+group+intensive+mentor);
}
