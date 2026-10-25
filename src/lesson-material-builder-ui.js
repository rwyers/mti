/* Per-lesson assignment builder, ADMIN ONLY. All changes remain drafts until Save lesson.
   Composite assignment text is built on the Worker and reused in student/print views. */
(function(){
 const previousOpen=openForm;
 openForm=function(type,id){
  previousOpen(type,id);
  if(type==="editlesson")mtiMountMaterialAssignmentBuilder(id);
 };
 window.openForm=openForm;
})();
function mtiMountMaterialAssignmentBuilder(lessonId){
 const lesson=DATA.lessons.find(l=>String(l.id)===String(lessonId));
 const form=el("recordForm"),base=el("f_assignment_instructions");
 if(!lesson||!form||!base||form.querySelector("#mtiMaterialBuilder"))return;
 const current=mtiMaterialCardsFrom(lesson.material_assignment_cards_json);
 if(current.base!==null)base.value=current.base;
 let cards=current.cards.map(c=>({
  type:String(c.type||""),
  title:mtiMaterialClean(c.title,180),
  author:mtiMaterialClean(c.author,140)
 })).filter(c=>c.title&&MTI_MATERIAL_CARD_TYPES.some(t=>t.value===c.type));
 let editing=-1;
 const host=document.createElement("section");
 host.id="mtiMaterialBuilder";
 host.setAttribute("aria-label","Lesson material assignment builder");
 host.style.cssText="border:1px solid #c9dcd1;border-radius:12px;background:#f7fbf8;margin:16px 0 20px;padding:16px";
 host.innerHTML='<style>'+
 '#mtiMaterialBuilder .mti-m-builder-head{margin:0 0 6px;font-size:16px;color:#245540}'+
 '#mtiMaterialBuilder .mti-m-help{font-size:12px;line-height:1.55;color:#526d5e;margin:0 0 15px}'+
 '#mtiMaterialBuilder .mti-m-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}'+
 '#mtiMaterialBuilder .mti-m-grid .full{grid-column:1/-1}'+
 '#mtiMaterialBuilder label{display:block;font-size:12px;font-weight:750;margin-bottom:5px;color:#405d50}'+
 '#mtiMaterialBuilder input,#mtiMaterialBuilder select{width:100%;font-size:13px;padding:10px}'+
 '#mtiMaterialBuilder .mti-m-tools{display:flex;gap:9px;flex-wrap:wrap;margin:11px 0 8px}'+
 '#mtiMaterialBuilder .mti-m-card{padding:13px 14px;margin:10px 0;border:1px solid #d9e5dd;border-radius:10px;background:#fff}'+
 '#mtiMaterialBuilder .mti-m-card-title{font-size:13px;color:#204b3c;font-weight:800}'+
 '#mtiMaterialBuilder .mti-m-tag{font-size:10px;padding:3px 7px;border-radius:5px;background:#e5f1e9;color:#356749;font-weight:750}'+
 '#mtiMaterialBuilder .mti-m-copy{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;color:#2c3d35;line-height:1.55;margin:10px 0 0}'+
 '#mtiMaterialBuilder .mti-m-action{display:flex;gap:7px;flex-shrink:0;flex-wrap:wrap}'+
 '#mtiMaterialBuilder .mti-m-action button{padding:6px 9px;font-size:11px}'+
 '#mtiMaterialBuilder .mti-m-delete{color:#953f45;border-color:#e7c2c4}'+
 '#mtiMaterialBuilder .mti-m-empty{border:1px dashed #c6d7ca;color:#5c7567;padding:18px;font-size:12px;border-radius:9px;text-align:center}'+
 '@media(max-width:550px){#mtiMaterialBuilder .mti-m-grid{grid-template-columns:1fr}#mtiMaterialBuilder .mti-m-grid .full{grid-column:auto}}'+
 '</style>'+
 '<h3 class="mti-m-builder-head">Add a material assignment</h3>'+
 '<p class="mti-m-help">Choose the assignment style and enter the book or material details. Each item stays in its own card, so you can update or delete one without touching the others. Existing instructions in the box above stay separate. <strong>Nothing changes for students until you click Save lesson.</strong></p>'+
 '<div class="mti-m-grid">'+
 '<div class="full"><label for="mtiMaterialType">1. Assignment type</label><select id="mtiMaterialType">'+
 MTI_MATERIAL_CARD_TYPES.map(t=>'<option value="'+esc(t.value)+'">'+esc(t.label)+'</option>').join("")+'</select></div>'+
 '<div><label for="mtiMaterialAuthor">2. Material author</label><input type="text" id="mtiMaterialAuthor" maxlength="140" placeholder="e.g. Joyce Meyer" autocomplete="off"></div>'+
 '<div><label for="mtiMaterialTitle">3. Material name / book title</label><input type="text" id="mtiMaterialTitle" maxlength="180" placeholder="e.g. Root of Rejection" autocomplete="off"></div>'+
 '</div>'+
 '<div class="mti-m-tools"><button type="button" id="mtiAddMaterial" class="primary">+ Add assignment card</button>'+
 '<button type="button" id="mtiCancelMaterial" class="outline hidden">Cancel editing</button></div>'+
 '<div id="mtiMaterialBuilderMessage" role="status" style="font-size:12px;color:#995341"></div>'+
 '<div style="border-top:1px solid #dbe9de;padding-top:13px;margin-top:13px">'+
 '<strong style="font-size:13px">Material assignment cards</strong>'+
 '<div id="mtiMaterialCards" aria-live="polite"></div>'+
 '<p style="font-size:11px;color:#648074;line-height:1.5;margin:12px 0 0">The lesson will show your existing written instructions first, then these cards as fully written assignments. Deleting a card removes only that material assignment.</p></div>';
 const hidden=document.createElement("input");
 hidden.type="hidden";hidden.name="material_assignment_cards_json";hidden.id="mtiMaterialCardsData";
 host.appendChild(hidden);
 const group=base.closest(".field");
 if(group)group.after(host);
 else base.after(host);
 const type=host.querySelector("#mtiMaterialType");
 const author=host.querySelector("#mtiMaterialAuthor");
 const title=host.querySelector("#mtiMaterialTitle");
 const list=host.querySelector("#mtiMaterialCards");
 const add=host.querySelector("#mtiAddMaterial");
 const cancel=host.querySelector("#mtiCancelMaterial");
 const msg=host.querySelector("#mtiMaterialBuilderMessage");
 const sync=()=>{
  hidden.value=JSON.stringify({version:1,base:base.value,cards});
 };
 function reset(){
  editing=-1;author.value="";title.value="";type.value="book_reflection";
  add.textContent="+ Add assignment card";cancel.classList.add("hidden");msg.textContent="";
 }
 function render(){
  list.innerHTML=cards.length?cards.map((c,i)=>{
   const label=MTI_MATERIAL_CARD_TYPES.find(t=>t.value===c.type)?.label||"Assignment";
   return '<div class="mti-m-card">'+
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
    '<div><span class="mti-m-tag">'+esc(label)+'</span><div class="mti-m-card-title" style="margin-top:7px">'+esc(c.title)+(c.author?' — '+esc(c.author):'')+'</div></div>'+
    '<div class="mti-m-action"><button type="button" class="outline" data-mti-m-edit="'+i+'">Edit</button>'+
    '<button type="button" class="outline mti-m-delete" data-mti-m-delete="'+i+'" aria-label="Delete '+esc(c.title)+' assignment">Delete</button></div></div>'+
    '<div class="mti-m-copy">'+esc(mtiMaterialCardBody(c))+'</div></div>';
  }).join(""):'<div class="mti-m-empty" style="margin-top:10px">No added material cards yet. Choose a type and enter a material name above.</div>';
  sync();
 }
 add.addEventListener("click",()=>{
  const name=mtiMaterialClean(title.value,180),writer=mtiMaterialClean(author.value,140);
  if(!name){msg.textContent="Enter a material name or book title first.";title.focus();return;}
  const chosen=type.value;
  if(!MTI_MATERIAL_CARD_TYPES.some(t=>t.value===chosen)){msg.textContent="Choose an assignment type.";return;}
  const card={type:chosen,title:name,author:writer};
  if(editing>=0&&editing<cards.length)cards[editing]=card;
  else{
   if(cards.length>=30){msg.textContent="This lesson already has 30 cards. Remove one before adding another.";return;}
   cards.push(card);
  }
  reset();render();
  list.lastElementChild?.scrollIntoView({block:"nearest",behavior:"smooth"});
 });
 cancel.addEventListener("click",reset);
 list.addEventListener("click",event=>{
  const editButton=event.target.closest("[data-mti-m-edit]");
  const deleteButton=event.target.closest("[data-mti-m-delete]");
  if(editButton){
   const i=Number(editButton.dataset.mtiMEdit),c=cards[i];if(!c)return;
   editing=i;type.value=c.type;author.value=c.author;title.value=c.title;
   add.textContent="Save changes to this card";cancel.classList.remove("hidden");
   msg.textContent="Editing this card only. Click Save changes to this card, then Save lesson.";
   host.scrollIntoView({block:"center",behavior:"smooth"});title.focus();
  }else if(deleteButton){
   const i=Number(deleteButton.dataset.mtiMDelete),c=cards[i];if(!c)return;
   cards.splice(i,1);reset();render();
   msg.textContent='Removed "'+c.title+'" from this lesson draft. Click Save lesson to save the removal.';
  }
 });
 base.addEventListener("input",sync);
 render();
}
