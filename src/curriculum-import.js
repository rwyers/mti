/* Source-based curriculum import. The MTI-published CSV links are maintained here;
   student data is never downloaded or handled by this module. */
const YEAR_GIDS=[1819085028,1973554611,217002562,1423619311,874632048];
const BUSY_GIDS=[1371315651,179043534,1974287502];
const IMPORT_SOURCES=[
 {course:"Pastoral Leadership DVD",id:"2PACX-1vRlCYOlrRImlK0Sy5XNuHPBU9Z2rS-R67WvU657zmyBsTNj4brhqLteLM-aGtpSfA",years:5},
 {course:"Leadership 5 Fold",id:"2PACX-1vQfKsGk6zIBTtkKBinUQku4X3UV6MizzIyEywDGcID33fp09OkWFLas4eKt-f8IjQ",years:5},
 {course:"Ministry in Business",id:"2PACX-1vTJKZtSV86vR1dsKjG6omGxSbutwbQb8B-EhlsynXPY95nOaEDb4v8oeZC4O1cyJw",years:4},
 {course:"Missions Audio",id:"2PACX-1vQjhLJp21KnENr_WK3L9ml7S2XgR3j1X8MRbkW_fTeauF96GZHlCadn3-G-zRvqPA",years:5},
 {course:"Missions",id:"2PACX-1vSiIOaB_VsshDan0K1lVuxwAZGMJm2WQWkZ80qS6lYoYnuDGFxem3YMjFWWpIqzLw",years:5},
 {course:"Music and Creative Arts",id:"2PACX-1vTq4Y5DCSHGT8SdiO8uvJHh1_IVcVVcF0YQ-xl4V2rJ1QBvDp7hcXREJ9c7ghbcXg",years:1},
 {course:"Alumni",id:"2PACX-1vTo-ep7nkVzmq3X3Ji90nsY1kDA0dFzcwLzOjcYhZfxRONS3fYowX2VMDS5H_FcJA",years:1},
 {course:"Pastoral Audio",id:"2PACX-1vRgOQ0E5SGunF9EJtnjJr2MlwjapO_y6syLdHu92buT7DLAMbTGX1SxzPAAUG6bqA",years:5},
 {course:"Busy Man Working Women",id:"2PACX-1vRCNa16HL2_89zl-FFQcXewIC8IXQqeG69d-KvXeDlzKqXKYVy_d0BAk7dXZEp_ew",years:3,busy:true},
 {course:"Counseling Audio",id:"2PACX-1vQbm69gsQxWcOTIsBQwfsPdABuTGOhFsS9w8OZvW-oftqPlGOdYU-etNvIpqpE5Bw",years:4}
];
function parseCurriculumCSV(csv){
 const rows=[],line=[];let value="",inside=false;
 for(let i=0;i<csv.length;i++){
  let ch=csv[i];if(ch==='"'){
   if(inside&&csv[i+1]==='"'){value+='"';i++}else inside=!inside;
  }else if(ch===","&&!inside){line.push(value);value=""}
  else if((ch==="\n"||ch==="\r")&&!inside){
   if(ch==="\r"&&csv[i+1]==="\n")i++;
   line.push(value);value="";if(line.some(x=>x.trim()))rows.push(line.splice(0));
   else line.length=0;
  }else value+=ch;
 }
 line.push(value);if(line.some(x=>x.trim()))rows.push(line);
 if(!rows.length)return [];
 const head=rows.shift().map(x=>x.replace(/^\uFEFF/,"").trim());
 return rows.map(row=>Object.fromEntries(head.map((h,i)=>[h,(row[i]||"").trim()])));
}
function publishedURL(source,year){
 const gid=source.busy?BUSY_GIDS[year-1]:YEAR_GIDS[year-1];
 return "https://docs.google.com/spreadsheets/d/e/"+source.id+"/pub?gid="+gid+"&single=true&output=csv";
}
function curricular(r,year){
 const number=Number(r["Lesson Number"]||r["Lesson"]||"");
 const credits=Number(r["Credits"]||0);
 const active=String(r["Active"]||"true").trim().toLowerCase();
 const fields={
  credits:Math.max(0,Math.min(50,Number.isFinite(credits)?credits:0)),
  memory_verse_reference:(r["Memory Verse Reference"]||"").slice(0,200),
  memory_verse_text:(r["Memory Verse Text"]||"").slice(0,2000),
  bible_instruction:(r["Bible Instruction"]||"").slice(0,6000),
  assignment_instructions:(r["Assignment Instructions"]||"").slice(0,12000),
  submission_notes:(r["Submission Notes"]||"").slice(0,3000),
  materials_list:(r["Materials List"]||"").slice(0,4000)
 };
 const meaningful=[fields.bible_instruction,fields.assignment_instructions,fields.memory_verse_reference].some(v=>v.length>15&& !/^ADD\b|^URL_HERE\b|^TBD\b/i.test(v));
 if(!Number.isInteger(number)||number<1||number>52||!meaningful||["false","0","inactive","no"].includes(active))return null;
 return {year,number,...fields};
}
async function fetchCurriculum(source,year){
 const c=new AbortController();const timer=setTimeout(()=>c.abort(),18000);
 try{
  const response=await fetch(publishedURL(source,year),{signal:c.signal,headers:{"Accept":"text/csv"}});
  if(!response.ok)throw new Error("Published sheet responded "+response.status);
  const raw=await response.text();
  if(raw.length>1000000)throw new Error("Published sheet unusually large");
  if(raw.trim().startsWith("<"))throw new Error("Published sheet returned HTML instead of CSV");
  const rows=parseCurriculumCSV(raw).map(r=>curricular(r,year)).filter(Boolean);
  return rows;
 }finally{clearTimeout(timer)}
}
async function curriculumCount(env){
 const r=await env.DB.prepare("SELECT c.id,c.name,COUNT(l.id) AS lessons FROM courses c LEFT JOIN lessons l ON l.course_id=c.id GROUP BY c.id,c.name ORDER BY c.name").all();
 return r.results;
}
async function importPublishedYear(env,name,year,actor){
 const source=IMPORT_SOURCES.find(x=>x.course===name);
 if(!source||!Number.isInteger(year)||year<1||year>source.years)throw new Error("The selected course/year does not have a published import source.");
 const rows=await fetchCurriculum(source,year);
 if(!rows.length)throw new Error("No populated lessons were found in that published year.");
 const course=await env.DB.prepare("SELECT id FROM courses WHERE name=?").bind(name).first();
 let courseId=course?.id;
 if(!courseId){
  courseId=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO courses (id,name,description) VALUES (?,?,'')").bind(courseId,name).run();
 }
 const statements=rows.map(row=>env.DB.prepare("INSERT OR IGNORE INTO lessons (id,course_id,year,lesson_number,credits,memory_verse_reference,memory_verse_text,bible_instruction,assignment_instructions,submission_notes,materials_list) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
  .bind(crypto.randomUUID(),courseId,row.year,row.number,row.credits,row.memory_verse_reference,row.memory_verse_text,row.bible_instruction,row.assignment_instructions,row.submission_notes,row.materials_list));
 const changes=await env.DB.batch(statements);
 const imported=changes.reduce((n,result)=>n+(result.meta?.changes||0),0),existing=rows.length-imported;
 if(imported)await auditAction(env,actor||null,"import_curriculum","course",courseId,null,{course:name,year,imported,existing,source:"published MTI curriculum"});
 return {course:name,year,found:rows.length,imported,existing};
}
async function curriculumProbe(){
 const source=IMPORT_SOURCES[0];const res=await fetch(publishedURL(source,1),{method:"GET"});
 return {status:res.status,ok:res.ok,length:Number(res.headers.get("content-length")||0),type:res.headers.get("content-type")};
}

async function importPublishedCourse(env,name){const source=IMPORT_SOURCES.find(s=>s.course===name);if(!source)throw Error("Unknown course source");const result=[];for(let year=1;year<=source.years;year++){try{result.push(await importPublishedYear(env,name,year,null));}catch(e){result.push({course:name,year,error:e.message})}}return result}
