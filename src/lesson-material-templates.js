/* Shared curriculum material assignment templates.
   Used by MTI's admin cards and the Worker, so printed/student wording matches previews.
   Cards are data, never HTML. Existing freeform lesson instructions are preserved. */
const MTI_MATERIAL_CARD_TYPES=[
 {value:"book_reflection",label:"Read a book + reflection"},
 {value:"fill_blanks",label:"Fill in the blanks"},
 {value:"book_study_guide",label:"Book and study guide"}
];
function mtiMaterialClean(v,max=180){
 return String(v==null?"":v).replace(/[\r\n\t]+/g," ").replace(/\s{2,}/g," ").trim().slice(0,max);
}
function mtiMaterialCardsFrom(raw){
 let data={};
 try{data=typeof raw==="string"?JSON.parse(raw||"{}"):raw||{};}catch{return {base:null,cards:[]}}
 if(!data||typeof data!=="object"||Array.isArray(data))return {base:null,cards:[]};
 return {base:typeof data.base==="string"?data.base:null,
  cards:Array.isArray(data.cards)?data.cards.filter(c=>c&&typeof c==="object"&&!Array.isArray(c)):[]};
}
/* Reusable instructions without the repeated title in an Admin assignment card. */
function mtiMaterialCardBody(card){
 const title=mtiMaterialClean(card?.title,180);
 const author=mtiMaterialClean(card?.author,140);
 const type=String(card?.type||"");
 if(!title||!MTI_MATERIAL_CARD_TYPES.some(x=>x.value===type))return "";
 const material=title+(author?" by "+author:"");
 if(type==="book_reflection")
  return "Read "+material+". Once you have completed the book, write a reflection covering the following:\n\n"+
   "1. What You Learned (1 page): Summarize the key lessons and insights you gained from the book.\n"+
   "2. Personal Application (1 paragraph): Explain how you can apply what you learned to your own life.\n"+
   "3. Helping Others (1 paragraph): Describe how you can use what you learned to help someone else who could benefit from these lessons.";
 if(type==="fill_blanks")
  return "Read "+material+" and complete the fill-in-the-blank questions in the assigned material. Fill in all the missing answers and hand in your completed work.";
 if(type==="book_study_guide")
  return "Read "+material+" and complete the accompanying study guide. Hand in the completed study guide with your lesson assignment.";
 return "";
}
function mtiMaterialCardText(card){
 const body=mtiMaterialCardBody(card);
 if(!body)return "";
 const title=mtiMaterialClean(card.title,180);
 const author=mtiMaterialClean(card.author,140);
 // This is the only title line in student/printed assignments.
 return title+(author?" — "+author:"")+"\n\n"+body;
}
function mtiMaterialCombinedText(base,cards){
 return [String(base||"").trim(),...(cards||[]).map(mtiMaterialCardText).filter(Boolean)].filter(Boolean).join("\n\n");
}
