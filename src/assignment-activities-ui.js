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
'.mti-hand-sheet .mh-entry{padding:3px 0 6px;border-bottom:1px dotted #d5ded6;break-inside:avoid-page}'+
'.mti-hand-sheet .mh-entry:last-child{border-bottom:0}'+
'.mti-hand-sheet .mh-entry .mh-line{margin:2px 0}'+
'.mti-hand-sheet .mh-entry-num{flex:0 0 20px;width:20px;font-size:9pt}'+
'.mti-hand-sheet .mh-footer{padding-top:8px;margin-top:8px;border-top:1px solid #a8b7aa;font-size:8pt;color:#586c60;display:flex;justify-content:space-between}'+
'@media print{'+
'.mti-hand-sheet{break-before:page!important;page-break-before:always!important;break-after:auto;page-break-after:auto;break-inside:avoid-page;page-break-inside:avoid-page;height:9.28in!important;max-height:9.28in!important;max-width:none!important;border:0!important;margin:0!important;padding:0!important;display:flex;flex-direction:column;color:black;font:10pt/1.3 Arial,Helvetica,sans-serif}'+
'.mti-hand-sheet .mh-body{flex:1;min-height:0}'+
'.mti-hand-sheet .mh-note,.mti-hand-sheet .mh-page,.mti-hand-sheet .mh-footer{color:#333}'+
'.mti-hand-sheet .mh-section{margin:0 0 5px}'+
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
   return '<div class="mh-entry"><div class="mh-line"><b class="mh-entry-num">'+n+'.</b>'+
    field(p+"date","Date")+field(p+"theme","Theme")+'</div>'+
    '<div class="mh-line"><b>Application:</b><span class="mh-answer">'+(value(p+"application")||'&nbsp;')+'</span></div>'+
    (value(p+"application")?'':'<div class="mh-rule"><span class="mh-rule-line"></span></div>')+'</div>';
  }).join(""));
 const group=heading("Small Group / Worship Encounter","For each of six meetings, write what you learned and how it applies to your Christian walk.",
  Array.from({length:6},(_,i)=>{
   const n=i+1,p="small_"+n+"_";
   return '<div class="mh-entry"><div class="mh-line"><b class="mh-entry-num">'+n+'.</b>'+
    field(p+"date","Date")+field(p+"taught","Taught")+'</div>'+
    '<div class="mh-line"><b>Application:</b><span class="mh-answer">'+(value(p+"application")||'&nbsp;')+'</span></div>'+
    (value(p+"application")?'':'<div class="mh-rule"><span class="mh-rule-line"></span></div>')+'</div>';
  }).join(""));
 const sheet=(n,topic,sections)=>
  '<section class="mti-hand-sheet" aria-label="MTI activity record printable page '+n+' of 2">'+
   '<div class="mh-head"><div><h3>MTI Lesson Activity Record</h3><span class="mh-page">Page '+n+' of 2 · '+topic+'</span></div>'+
   '<div class="mh-name">Student: ______________________<br>Date: ________________________</div></div>'+
   '<div class="mh-body">'+sections+'</div>'+
   '<div class="mh-footer"><span>'+(n===2?'Return completed paper assignment to your MTI instructor.':'Ministry Training Institute · Handwritten activity record')+'</span><span>Page '+n+' / 2</span></div>'+
   '</section>';
 return MTI_HANDWRITING_PRINT_CSS+
  sheet(1,"Service, personal evangelism and Sunday attendance",service+evangelism+attendance)+
  sheet(2,"Confessions and small-group / worship encounters",confessions+group);
}


/* Blank instructor marking area for the LESSON portion of a printout.
   It appears before the two optional handwriting activity sheets.
   These are the October 2026 office rubric values, not student marks.
   Never include private unfinished grading drafts in printed lessons. */
function mtiOfficeGradingPrintHtml(){
 const core=[
  ["Scripture Memorized",5],["Practical Service",18],["Bible Reading",6],
  ["Assignment",35],["Church Attendance",18],["Small Groups",18]
 ];
 const bonuses=[
  ["Invite someone to church (2 pts each)",10],["Confessions",3],["Next Steps",4]
 ];
 // One fixed-width line and one right-aligned maximum in every scoring row.
 const score=max=>'<span class="mti-office-score-fill"><span class="mti-office-score-line" aria-hidden="true"></span><span class="mti-office-score-max">/'+max+'</span></span>';
 const line=([name,max])=>'<div class="mti-office-mark-row"><span>'+name+'</span>'+score(max)+'</div>';
 return '<style>'+
 '.mti-office-marks{border:1.5px solid #344c3c;border-radius:3px;margin:18px 0 22px;padding:13px 16px 15px;background:white;color:#1b2820;font:10pt/1.25 Arial,Helvetica,sans-serif;break-inside:avoid-page;page-break-inside:avoid}'+
 '.mti-office-marks *{box-sizing:border-box}'+
 '.mti-office-marks .mti-office-heading{display:flex;align-items:baseline;justify-content:space-between;gap:10px;border-bottom:1px solid #a9b6ae;padding:0 0 5px;margin-bottom:9px}'+
 '.mti-office-marks h2{font:bold 13pt/1.2 Arial,Helvetica,sans-serif!important;color:#213b2c!important;border:0!important;padding:0!important;margin:0!important}'+
 '.mti-office-marks .mti-office-heading span{font-size:8pt;color:#56675d}'+
 '.mti-office-marks .mti-office-columns{display:grid;grid-template-columns:minmax(0,1.03fr) minmax(0,1.37fr);gap:9px}'+
 '.mti-office-marks .mti-office-title{font-weight:bold;font-size:9pt;margin:0 0 5px;color:#40574b}'+
 '.mti-office-marks .mti-office-mark-row{display:flex;justify-content:space-between;gap:9px;align-items:baseline;min-height:19px;margin:3px 0}'+
 '.mti-office-marks .mti-office-mark-row>span:first-child{flex:1;min-width:0}'+
 '.mti-office-marks .mti-office-score-fill{display:grid;grid-template-columns:50px 38px;flex:0 0 88px;min-width:88px;align-items:end;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}'+
 '.mti-office-marks .mti-office-score-line{display:block;width:50px;height:1em;border-bottom:1px solid #33493d}'+
 '.mti-office-marks .mti-office-score-max{display:block;min-width:38px;text-align:right;line-height:1.2}'+
 '.mti-office-marks .mti-office-bonus .mti-office-mark-row>span:first-child{white-space:nowrap;font-size:8.5pt;letter-spacing:-.1px}'+
 '.mti-office-marks .mti-office-bonus{padding-left:9px;border-left:1px solid #d1d9d3;min-width:0}'+
 '.mti-office-marks .mti-office-total{border-top:1px solid #9dab9f;display:flex;justify-content:space-between;gap:10px;align-items:baseline;padding-top:8px;margin-top:9px;font-size:11pt;font-weight:800}'+
 '.mti-office-marks .mti-office-total .mti-office-score-fill{font-size:11pt}'+
 '.mti-office-marks .mti-office-bonus-subtotal{display:flex;align-items:baseline;justify-content:space-between;gap:9px;margin-top:8px;padding-top:7px;border-top:1px solid #d1d9d3;font-size:8.5pt;font-weight:700}'+
 '.mti-office-marks .mti-office-note{font-size:8pt;color:#536759;margin-top:6px}'+
 '@media print{.mti-office-marks{break-inside:avoid-page!important;page-break-inside:avoid!important;background:#fff!important;max-width:none!important;margin:16px 0 18px;padding:12px 14px}.mti-office-marks .mti-office-heading span,.mti-office-marks .mti-office-note{color:#333!important}}'+
 '@media(max-width:520px){.mti-office-marks .mti-office-columns{grid-template-columns:1fr}.mti-office-marks .mti-office-bonus{border-left:0;padding-left:0;border-top:1px solid #ddd;padding-top:8px}}'+
 '</style>'+
 '<section class="mti-office-marks" aria-label="For office use only: instructor grading rubric">'+
 '<div class="mti-office-heading"><h2>For Office Use Only</h2><span>MTI grading sheet</span></div>'+
 '<div class="mti-office-columns">'+
 '<div><div class="mti-office-title">Core marking · out of 100</div>'+core.map(line).join("")+
 '<div class="mti-office-total"><span>Total</span>'+score(100)+'</div></div>'+
 '<div class="mti-office-bonus"><div class="mti-office-title">Bonus · separate from /100</div>'+bonuses.map(line).join("")+
 '<div class="mti-office-bonus-subtotal"><span>Bonus subtotal</span>'+score(17)+'</div></div></div>'+
 '</section>';
}


/* First page of printable MTI assignments. Keep the following two activity pages
   unchanged. This cover contains the full assignment instructions + office rubric.
   Large supplemental resource lists and submitted responses get an explicit online
   continuation note instead of making the cover overflow and shifting the worksheets. */
function mtiLessonPrintCoverHtml(record){
 const data=record||{},escape=mtiActivityEscape;
 const plain=(value)=>String(value==null?"":value).replace(/\r\n?/g,"\n").trim();
 const card=(label,body,tag,extraClass="")=>body?
  '<section class="mti-cover-card '+extraClass+'"><div class="mti-cover-card-head"><span class="mti-cover-card-icon">'+tag+'</span><h2>'+escape(label)+'</h2></div><div class="mti-cover-card-copy">'+body+'</div></section>':"";
 const prose=(value)=>escape(plain(value));
 const fullResources=plain(data.materials);
 const fullResponse=plain(data.response);
 const shorten=(value,limit)=>value.length<=limit?value:value.slice(0,limit).replace(/\s+\S*$/,"").trimEnd()+"…";
 const clippedResources=fullResources.length>850,clippedResponse=fullResponse.length>420;
 const continuation='<div class="mti-cover-online-note">Additional details are available in the online MTI lesson.</div>';
 const scriptureParts=[
  plain(data.verseRef)?'<strong class="mti-cover-verse-ref">'+prose(data.verseRef)+'</strong>':"",
  plain(data.verseText)?'<div>'+prose(data.verseText)+'</div>':""
 ].filter(Boolean).join("");
 const panels=[
  card("Memory Scripture",scriptureParts,"01","mti-cover-scripture"),
  card("Bible Reflection",prose(data.bible),"02","mti-cover-bible"),
  card("Assignment Instructions",prose(data.assignment),"03","mti-cover-assignment"),
  card("Required Materials",prose(shorten(fullResources,850))+(clippedResources?continuation:""),"04","mti-cover-materials")
 ].filter(Boolean).join("");
 const submittedResponse=fullResponse?card("Submitted Response",prose(shorten(fullResponse,420))+
  (clippedResponse?'<div class="mti-cover-online-note">The complete submitted response is available online.</div>':""),"05","mti-cover-response"):"";
 const title=plain(data.course)||plain(data.assignmentTitle)||"MTI Lesson";
 const name=plain(data.student);
 const labelYear=plain(data.year),lesson=plain(data.lesson);
 const sheet='Sheet 1 of 3';
 return '<style>'+
 '.mti-cover-page,.mti-cover-page *{box-sizing:border-box}'+
 '.mti-cover-page{position:relative;width:100%;height:9.25in;max-height:9.25in;background:#fff;color:#1a3229;font:9pt/1.37 Arial,Helvetica,sans-serif;overflow:hidden}'+
 '.mti-cover-page .mti-cover-content{position:absolute;left:0;top:0;width:100%;transform-origin:top left}'+
 '.mti-cover-page .mti-cover-topline{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:8px;border-bottom:2px solid #35624c}'+
 '.mti-cover-page .mti-cover-brand{font-size:8pt;font-weight:800;letter-spacing:1.25px;text-transform:uppercase;color:#35624c}'+
 '.mti-cover-page .mti-cover-sheet{font-size:8pt;color:#667c71;font-weight:700}'+
 '.mti-cover-page .mti-cover-titleline{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:11px 0 9px}'+
 '.mti-cover-page .mti-cover-titleline h1{font:bold 18pt/1.16 Arial,Helvetica,sans-serif!important;color:#1a4030!important;margin:0 0 5px!important;letter-spacing:-.35px}'+
 '.mti-cover-page .mti-cover-caption{font-size:8.5pt;color:#607468}'+
 '.mti-cover-page .mti-cover-year{flex:0 0 auto;white-space:nowrap;background:#eff5f0;border:1px solid #d5e5d9;border-radius:7px;padding:6px 9px;font-size:8pt;font-weight:800;color:#305e48}'+
 '.mti-cover-page .mti-cover-meta{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.7fr);gap:14px;padding:10px 13px;background:#f6f9f6;border:1px solid #dce7dd;border-radius:8px;margin-bottom:10px}'+
 '.mti-cover-page .mti-cover-meta-cell{display:flex;align-items:baseline;gap:8px;min-width:0}'+
 '.mti-cover-page .mti-cover-meta-cell strong{font-size:8pt;color:#55705f;white-space:nowrap;text-transform:uppercase;letter-spacing:.25px}'+
 '.mti-cover-page .mti-cover-meta-value{flex:1;min-width:0;border-bottom:1px solid #97b09e;font-size:9pt;min-height:13px;overflow-wrap:anywhere}'+
 '.mti-cover-page .mti-cover-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:9px;align-items:start}'+
 '.mti-cover-page .mti-cover-card{background:#fff;border:1px solid #d6e2d9;border-radius:9px;padding:9px 11px;min-width:0;break-inside:avoid}'+
 '.mti-cover-page .mti-cover-card-head{display:flex;align-items:center;gap:7px;margin:0 0 7px}'+
 '.mti-cover-page .mti-cover-card-icon{display:inline-flex;align-items:center;justify-content:center;width:21px;height:21px;flex:0 0 21px;border-radius:6px;background:#e5f0e9;color:#28543b;font:bold 8pt Arial,Helvetica,sans-serif}'+
 '.mti-cover-page .mti-cover-card h2{margin:0!important;padding:0!important;font:bold 9.5pt/1.2 Arial,Helvetica,sans-serif!important;letter-spacing:.1px;color:#1e4431!important;border:0!important}'+
 '.mti-cover-page .mti-cover-card-copy{white-space:pre-wrap;overflow-wrap:anywhere;font:8.6pt/1.39 Arial,Helvetica,sans-serif;color:#273a30}'+
 '.mti-cover-page .mti-cover-scripture,.mti-cover-page .mti-cover-bible{grid-column:span 1}'+
 '.mti-cover-page .mti-cover-assignment,.mti-cover-page .mti-cover-materials,.mti-cover-page .mti-cover-response{grid-column:1/-1}'+
 '.mti-cover-page .mti-cover-assignment{border-left:3px solid #47785c}'+
 '.mti-cover-page .mti-cover-verse-ref{display:block;margin-bottom:3px;color:#28533d}'+
 '.mti-cover-page .mti-cover-online-note{margin-top:7px;color:#66776e;font-size:7.3pt;font-style:italic;border-top:1px dashed #cedbd1;padding-top:5px}'+
 '.mti-cover-page .mti-office-marks{border:1px solid #ceded2;border-top:3px solid #45735b!important;border-radius:9px;margin:10px 0 0!important;padding:10px 12px 11px!important;font:8.5pt/1.23 Arial,Helvetica,sans-serif;break-inside:avoid;background:#fbfdfb}'+
 '.mti-cover-page .mti-office-marks h2{font-size:11pt!important;color:#1e4330!important}'+
 '.mti-cover-page .mti-office-marks .mti-office-mark-row{min-height:16px;margin:2px 0}'+
 '.mti-cover-page .mti-office-marks .mti-office-title{font-size:8pt}'+
 '.mti-cover-page .mti-office-marks .mti-office-columns{grid-template-columns:minmax(0,1.03fr) minmax(0,1.37fr)}'+
 '.mti-cover-page .mti-cover-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid #d7e2d9;margin-top:8px;padding:6px 2px 0;font-size:7pt;letter-spacing:.1px;color:#6b7c70}'+
 '@media print{.mti-cover-page{height:9.25in!important;max-height:9.25in!important;overflow:hidden!important;page-break-after:auto;break-after:auto;background:#fff!important;margin:0!important}.mti-cover-page .mti-cover-meta{background:#fff}.mti-cover-page .mti-office-marks{background:#fff!important}}'+
 '</style>'+
 '<section class="mti-cover-page" aria-label="MTI printable assignment cover, '+sheet+'"><div class="mti-cover-content">'+
 '<div class="mti-cover-topline"><span class="mti-cover-brand">Ministry Training Institute</span><span class="mti-cover-sheet">'+sheet+' · Assignment</span></div>'+
 '<div class="mti-cover-titleline"><div><h1>'+escape(title)+'</h1><div class="mti-cover-caption">'+escape(plain(data.assignmentTitle)&&plain(data.assignmentTitle)!==title?data.assignmentTitle:"Lesson study & assignment")+'</div></div>'+
 '<div class="mti-cover-year">'+(labelYear?'YEAR '+escape(labelYear)+' · ':'')+(lesson?'LESSON '+escape(lesson):'MTI')+'</div></div>'+
 '<div class="mti-cover-meta"><div class="mti-cover-meta-cell"><strong>Student</strong><span class="mti-cover-meta-value">'+(name?escape(name):'&nbsp;')+'</span></div>'+
 '<div class="mti-cover-meta-cell"><strong>Date</strong><span class="mti-cover-meta-value">'+escape(plain(data.date))+'&nbsp;</span></div></div>'+
 '<div class="mti-cover-grid">'+panels+submittedResponse+'</div>'+
 mtiOfficeGradingPrintHtml()+
 '<div class="mti-cover-footer"><span>MTI · Lesson worksheet</span><span>Additional handwriting activities follow on sheets 2–3</span></div>'+
 '</div></section>';
}
/* Shrink only when necessary so the complete assignment and grading area stay
   inside page 1. The two following handwriting sheets are never changed. */
function mtiFitLessonPrintCover(root){
 if(!root)return 1;
 const inner=root.querySelector(".mti-cover-content");
 if(!inner)return 1;
 let scale=1;
 const available=root.clientHeight||Math.round(9.25*96);
 if(!available)return scale;
 for(let pass=0;pass<7;pass++){
  inner.style.width=(100/scale).toFixed(2)+"%";
  inner.style.transform="scale("+scale+")";
  const needed=inner.scrollHeight*scale;
  if(needed<=available-4)break;
  scale=Math.max(.47,Math.min(scale*.93,scale*(available-10)/Math.max(needed,1)));
  if(scale<=.47)break;
 }
 inner.style.width=(100/scale).toFixed(2)+"%";
 inner.style.transform="scale("+scale+")";
 return scale;
}
