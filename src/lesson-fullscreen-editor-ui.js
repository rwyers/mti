/* Full-screen Edit lesson workspace. Only lessons use this layout;
   other MTI admin dialogs continue to use the existing compact modal.
   Form changes remain drafts until Save lesson; never discard by backdrop click. */
(function installMTIFullLessonEditor(){
 const styles=document.createElement("style");
 styles.id="mtiLessonWorkspaceStyles";
 styles.textContent=[
 '#overlay.mti-lesson-fullscreen{padding:0!important;display:flex!important;align-items:stretch!important;justify-content:stretch!important;background:#f4f7f5!important;z-index:150}',
 '#overlay.mti-lesson-fullscreen.hidden{display:none!important}',
 '#overlay.mti-lesson-fullscreen .modal{width:100vw!important;max-width:none!important;height:100vh;height:100dvh;max-height:none!important;min-height:0;border-radius:0!important;box-shadow:none!important;padding:0!important;display:flex;flex-direction:column;overflow:hidden;background:#f4f7f5}',
 '#overlay.mti-lesson-fullscreen .modal-top{padding:15px clamp(18px,3.5vw,64px);margin:0;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:20px;background:#fff;border-bottom:1px solid #d7e3dc;box-shadow:0 2px 8px #12372a0a;z-index:1}',
 '#overlay.mti-lesson-fullscreen .modal-top h2{font:normal clamp(24px,2vw,32px)/1.1 Georgia,serif}',
 '#overlay.mti-lesson-fullscreen .mti-lesson-subtitle{font-size:12px;color:#5f756b;margin:4px 0 0;line-height:1.35}',
 '#overlay.mti-lesson-fullscreen .modal-top .close{width:auto;height:auto;min-height:38px;padding:8px 14px;white-space:nowrap;font-size:12px;font-weight:750;display:flex;align-items:center;gap:7px}',
 '#overlay.mti-lesson-fullscreen #modalBody{min-height:0;flex:1;overflow:auto;overscroll-behavior:contain;padding:0;scrollbar-gutter:stable}',
 '#overlay.mti-lesson-fullscreen #recordForm{max-width:1560px;margin:0 auto;padding:22px clamp(18px,3vw,50px) 40px}',
 '#overlay.mti-lesson-fullscreen #recordForm>.mti-review-panel{display:flex;gap:20px;align-items:center;justify-content:space-between;padding:12px 17px;margin:0 0 18px;background:#fff;border:1px solid #d9e5df}',
 '#overlay.mti-lesson-fullscreen #recordForm>.mti-review-panel h3{white-space:nowrap;font-size:13px}',
 '#overlay.mti-lesson-fullscreen #recordForm>.mti-review-panel p{font-size:11px;margin:0;max-width:530px}',
 '#overlay.mti-lesson-fullscreen .mti-review-tabs{min-width:min(100%,330px);flex:0 1 360px}',
 '#overlay.mti-lesson-fullscreen .mti-review-tabs label{min-width:110px}',
 '#overlay.mti-lesson-fullscreen .mti-review-tabs span{padding:9px 10px;font-size:11px;text-align:center}',
 '#overlay.mti-lesson-fullscreen .mti-editor-columns{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(340px,.85fr);gap:21px;align-items:start}',
 '#overlay.mti-lesson-fullscreen .mti-editor-panel{min-width:0;background:white;border:1px solid #dae5de;border-radius:12px;padding:clamp(15px,1.8vw,26px);box-shadow:0 2px 10px #142c2506}',
 '#overlay.mti-lesson-fullscreen .mti-editor-panel>h3{font-size:16px;color:#204a38;margin:0 0 5px}',
 '#overlay.mti-lesson-fullscreen .mti-editor-panel>.mti-editor-hint{font-size:12px;line-height:1.5;color:#638072;margin:0 0 19px}',
 '#overlay.mti-lesson-fullscreen .formgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px}',
 '#overlay.mti-lesson-fullscreen .formgrid>.span2{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px}',
 '#overlay.mti-lesson-fullscreen .formgrid .mti-editor-wide{grid-column:1/-1}',
 '#overlay.mti-lesson-fullscreen .formgrid textarea{min-height:125px;line-height:1.5;resize:vertical}',
 '#overlay.mti-lesson-fullscreen .formgrid textarea#f_assignment_instructions{min-height:225px}',
 '#overlay.mti-lesson-fullscreen .formgrid textarea#f_bible_instruction{min-height:145px}',
 '#overlay.mti-lesson-fullscreen .formgrid textarea#f_memory_verse_text{min-height:110px}',
 '#overlay.mti-lesson-fullscreen .formgrid input,#overlay.mti-lesson-fullscreen .formgrid select{min-width:0}',
 '#overlay.mti-lesson-fullscreen #mtiMaterialBuilder{margin:0 0 19px!important}',
 '#overlay.mti-lesson-fullscreen #mtiAiEditor{margin:0!important}',
 '#overlay.mti-lesson-fullscreen #formError{flex-shrink:0;margin:0;padding:0 clamp(18px,3.5vw,64px);background:#fff}',
 '#overlay.mti-lesson-fullscreen #formError:not(:empty){padding-top:8px;padding-bottom:8px;border-top:1px solid #edd5d3}',
 '#overlay.mti-lesson-fullscreen .modal-actions.mti-lesson-footer{margin:0!important;padding:13px clamp(18px,3.5vw,64px)!important;flex-shrink:0;background:white;border-top:1px solid #d7e3dc;box-shadow:0 -6px 24px #0c302019;display:flex;align-items:center;gap:12px}',
 '#overlay.mti-lesson-fullscreen .mti-lesson-save-hint{margin-right:auto;font-size:12px;color:#638073}',
 '#overlay.mti-lesson-fullscreen .modal-actions button{min-width:125px}',
 '#overlay.mti-lesson-fullscreen .modal-actions button.primary{font-size:13px;padding:12px 19px}',
 '@media(max-width:1020px){#overlay.mti-lesson-fullscreen .mti-editor-columns{grid-template-columns:1fr}#overlay.mti-lesson-fullscreen #recordForm>.mti-review-panel{flex-wrap:wrap}#overlay.mti-lesson-fullscreen .mti-review-tabs{flex:1 1 270px}}',
 '@media(max-width:590px){#overlay.mti-lesson-fullscreen .modal-top{padding:12px 14px}#overlay.mti-lesson-fullscreen #recordForm{padding:16px 12px 35px}#overlay.mti-lesson-fullscreen .mti-editor-panel{padding:14px}#overlay.mti-lesson-fullscreen .formgrid{grid-template-columns:1fr}#overlay.mti-lesson-fullscreen .formgrid>.span2{grid-template-columns:1fr}#overlay.mti-lesson-fullscreen .formgrid>.span2,#overlay.mti-lesson-fullscreen .formgrid .mti-editor-wide{grid-column:1}#overlay.mti-lesson-fullscreen #recordForm>.mti-review-panel{gap:8px}#overlay.mti-lesson-fullscreen #recordForm>.mti-review-panel p{display:none}#overlay.mti-lesson-fullscreen .mti-review-tabs{min-width:0}#overlay.mti-lesson-fullscreen .mti-review-tabs label{min-width:110px}#overlay.mti-lesson-fullscreen .modal-actions.mti-lesson-footer{padding:10px 12px!important}#overlay.mti-lesson-fullscreen .modal-actions button{min-width:0}#overlay.mti-lesson-fullscreen .mti-lesson-save-hint{display:none}}'
 ].join("\n");
 document.head.appendChild(styles);
 let active=null;
 const oldOpen=openForm,oldClose=closeForm;
 function values(form){
  // Includes manual fields, hidden material-card JSON, radio choices, and even
  // draft author/title and voice text not yet committed to a material card.
  return JSON.stringify(Array.from(form.querySelectorAll("input,textarea,select"))
   .filter(x=>x.type!=="submit"&&x.type!=="button")
   .map(x=>[x.name||x.id,x.type,(x.type==="checkbox"||x.type==="radio")?x.checked:x.value]));
 }
 function dirty(state){return !!state?.form?.isConnected&&values(state.form)!==state.initial;}
 function resetWorkspace(){
  if(!active)return;
  const state=active;active=null;
  // Restore submit button's form ownership before clearing the dialog.
  if(state.actions?.isConnected&&state.form?.isConnected){
   state.actions.classList.remove("mti-lesson-footer");
   const hint=state.actions.querySelector(".mti-lesson-save-hint");if(hint)hint.remove();
   state.actions.querySelector('[type="submit"]')?.removeAttribute("form");
   state.form.appendChild(state.actions);
  }
  document.getElementById("overlay")?.classList.remove("mti-lesson-fullscreen");
  const close=state.closeButton;
  if(close){close.textContent="×";close.setAttribute("aria-label","Close form");}
  if(state.titleStack?.isConnected){
   const headingTitle=state.titleStack.querySelector("#modalTitle");
   if(headingTitle)state.titleStack.replaceWith(headingTitle);
   else state.titleStack.remove();
  }
  document.body.style.overflow=state.previousBodyOverflow;
 }
 closeForm=function(saved){
  if(active && saved!==true && dirty(active) &&
     !window.confirm("You have unsaved lesson changes. Leave the editor and discard those changes?")){
   return false;
  }
  resetWorkspace();
  oldClose();
  return true;
 };
 window.closeForm=closeForm;
 openForm=function(type,id){
  oldOpen(type,id); // All existing forms, material cards and AI controls mount first.
  if(type!=="editlesson")return;
  const overlay=document.getElementById("overlay");
  const modal=overlay?.querySelector(".modal"),form=document.getElementById("recordForm");
  if(!modal||!form||!form.querySelector(".formgrid"))return;
  const heading=modal.querySelector(".modal-top");
  const close=heading?.querySelector(".close");
  const actions=form.querySelector(".modal-actions");
  const grid=form.querySelector(".formgrid");
  const builder=form.querySelector("#mtiMaterialBuilder"),ai=form.querySelector("#mtiAiEditor");
  if(!heading||!close||!actions||!grid)return;
  overlay.classList.add("mti-lesson-fullscreen");
  const lesson=(DATA?.lessons||[]).find(l=>String(l.id)===String(id));
  const course=(DATA?.courses||[]).find(c=>String(c.id)===String(lesson?.course_id));
  const subtitle=document.createElement("div");
  subtitle.className="mti-lesson-subtitle";
  subtitle.textContent=[course?.name||"Course",lesson?"Year "+lesson.year+" · Lesson "+lesson.lesson_number:""].filter(Boolean).join(" — ");
  const title=modal.querySelector("#modalTitle");
  const titleStack=document.createElement("div");titleStack.className="mti-lesson-title-stack";
  if(title){title.before(titleStack);titleStack.append(title,subtitle);}
  else heading.prepend(subtitle);
  // Keep a deliberate labelled exit, with dirty-change protection.
  close.textContent="Close editor";
  close.setAttribute("aria-label","Close lesson editor");
  // Use the entire screen: main lesson fields on left, materials and AI tools on right.
  const columns=document.createElement("div");columns.className="mti-editor-columns";
  const main=document.createElement("section");main.className="mti-editor-panel";
  main.innerHTML='<h3>Lesson details & instructions</h3><p class="mti-editor-hint">Edit the lesson and its written instructions here. Changes are saved only when you select Save lesson.</p>';
  const side=document.createElement("section");side.className="mti-editor-panel";
  side.innerHTML='<h3>Materials & assignment tools</h3><p class="mti-editor-hint">Add or remove individual material assignments and use the AI assistant without leaving the lesson editor.</p>';
  for(const key of ["memory_verse_text","bible_instruction","assignment_instructions"]){
   document.getElementById("f_"+key)?.closest(".field")?.classList.add("mti-editor-wide");
  }
  main.appendChild(grid);
  if(builder)side.appendChild(builder);
  if(ai)side.appendChild(ai);
  columns.append(main,side);
  form.appendChild(columns);
  // Footer outside the scrolling content; HTML's form attribute preserves
  // the existing Save lesson submit handler without reimplementation.
  actions.classList.add("mti-lesson-footer");
  const hint=document.createElement("span");
  hint.className="mti-lesson-save-hint";
  hint.textContent="Changes are not published until you save.";
  actions.prepend(hint);
  const submit=actions.querySelector('[type="submit"]');
  if(submit)submit.setAttribute("form","recordForm");
  modal.appendChild(actions);
  const previousBodyOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  active={form,actions,closeButton:close,titleStack,initial:values(form),previousBodyOverflow};
  modal.querySelector("#modalBody")?.scrollTo(0,0);
 };
 window.openForm=openForm;
 // Never dismiss the lesson workspace by clicking outside of it.
 document.getElementById("overlay")?.addEventListener("click",event=>{
  if(active&&event.target===event.currentTarget){
   event.preventDefault();event.stopImmediatePropagation();
  }
 },true);
 // Escape is not a safe discard action for an editing workspace.
 document.addEventListener("keydown",event=>{
  if(active&&event.key==="Escape"&&!document.getElementById("overlay")?.classList.contains("hidden")){
   event.preventDefault();event.stopImmediatePropagation();
  }
 },true);
 // Warn if the browser tab is closed or refreshed with unsaved lesson edits.
 window.addEventListener("beforeunload",event=>{
  if(active&&dirty(active)){event.preventDefault();event.returnValue="";}
 });
})();