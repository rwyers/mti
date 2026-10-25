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
function mtiActivityPrintHtml(raw){
 const data=mtiActivityData(raw);
 return MTI_ACTIVITY_CSS+'<section class="mti-activity-record mti-act-print"><h3>MTI Lesson Activity Record</h3>'+
 MTI_ACTIVITY_SECTIONS.map(section=>'<div class="mti-act-section"><h4>'+mtiActivityEscape(section.title)+'</h4>'+
  '<p class="mti-act-note">'+mtiActivityEscape(section.note)+'</p>'+
  section.rows.map(row=>'<div class="mti-act-print-row">'+row.map(field=>{
   const value=String(data[field.key]||"").trim();
   const lines=field.lines===9?9:field.multiline?2:1;
   return '<div style="margin-bottom:7px"><strong>'+mtiActivityEscape(field.label)+':</strong>'+
    (value?'<div class="mti-act-print-value">'+mtiActivityEscape(value)+'</div>':
     Array.from({length:lines},()=>'<span class="mti-act-blank"></span>').join(""))+
    '</div>';
  }).join("")+'</div>').join("")+'</div>').join("")+
 '</section>';
}