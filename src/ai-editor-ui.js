/* MTI AI editing controls, shown only when a staff member edits a lesson.
   Voice transcribes within the browser; text and proposed changes go to the
   secure Worker. Changes are NEVER saved until the normal Save lesson action.
 */
const MTI_AI_LABELS={
 memory_verse_reference:"Scripture reference",
 memory_verse_text:"Memory verse text",
 bible_instruction:"Bible study instructions",
 assignment_instructions:"Assignment instructions",
 submission_notes:"Submission instructions",
 materials_list:"Materials list"
};
var MTI_ACTIVE_AI_EDIT=null;
var MTI_VOICE_RECOGNITION=null;
const mtiPrevOpenLessonForm=openForm;
openForm=function(type,id){
 mtiPrevOpenLessonForm(type,id);
 if(type==="editlesson")mountMTIAIControls(id);
};
window.openForm=openForm;
function mountMTIAIControls(id){
 const form=el("recordForm");if(!form||form.dataset.mtiAiMounted)return;
 form.dataset.mtiAiMounted="true";MTI_ACTIVE_AI_EDIT={lessonId:id,proposal:null};
 const submit=form.querySelector(".modal-actions");
 if(!submit)return;
 const tools=document.createElement("section");tools.id="mtiAiEditor";
 tools.style.cssText="border:1px solid #dce6df;border-radius:12px;background:#f7faf7;padding:19px;margin:24px 0";
 tools.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div><h3 style="margin:0;color:#1e4949">AI lesson assistant</h3><p style="margin:7px 0 14px;font-size:12px;color:#58716d">Review every suggestion before applying it. Nothing is saved until you click Save lesson.</p></div><span style="font-size:24px">✦</span></div>'+
 '<button type="button" class="outline" id="mtiProofreadBtn">Proofread entire lesson</button>'+
 '<div class="field" style="margin-top:16px"><label for="mtiVoiceCommand">Change something in this lesson</label>'+
 '<textarea id="mtiVoiceCommand" rows="3" placeholder="Type or paste an instruction, e.g. Change the memory verse to Jeremiah 29:11 NIV." style="width:100%;margin-top:6px"></textarea></div>'+
 '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button type="button" class="outline" id="mtiVoiceBtn">🎙 Speak instruction</button>'+
 '<button type="button" class="primary" id="mtiCommandBtn">Preview instructed change</button></div>'+
 '<div class="small" id="mtiVoiceSupport" style="margin:9px 0">Voice recognition depends on browser support. You can always type or paste an instruction.</div>'+
 '<div id="mtiAiPreview" aria-live="polite" style="margin-top:16px"></div>';
 submit.before(tools);
 el("mtiProofreadBtn").addEventListener("click",()=>requestMTIAIDraft("proofread",id));
 el("mtiCommandBtn").addEventListener("click",()=>requestMTIAIDraft("instruction",id));
 el("mtiVoiceBtn").addEventListener("click",()=>startMTIVoice());
}
function collectMTIEditableFields(){
 const draft={};
 Object.keys(MTI_AI_LABELS).forEach(k=>{draft[k]=el("f_"+k)?.value||""});
 return draft;
}
async function requestMTIAIDraft(mode,id){
 const target=el("mtiAiPreview"),instruction=el("mtiVoiceCommand")?.value?.trim()||"";
 if(mode==="instruction"&&!instruction){target.innerHTML='<p style="color:#a24b44">Speak, type or paste an instruction first.</p>';return}
 const button=el(mode==="proofread"?"mtiProofreadBtn":"mtiCommandBtn");
 const all=[el("mtiProofreadBtn"),el("mtiCommandBtn")].filter(Boolean);
 all.forEach(b=>b.disabled=true);target.innerHTML='<p>Preparing a proposed change…</p>';
 const before=collectMTIEditableFields();
 try{
  const proposal=await api("/api/admin/lessons/"+encodeURIComponent(id)+"/ai-draft",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({mode,instruction,draft:before})
  });
  if(!MTI_ACTIVE_AI_EDIT||MTI_ACTIVE_AI_EDIT.lessonId!==id)return;
  MTI_ACTIVE_AI_EDIT.proposal=proposal;MTI_ACTIVE_AI_EDIT.before=before;
  const changes=Object.entries(proposal.changes||{});
  if(!changes.length){target.innerHTML='<div class="callout">No edits recommended. Your lesson text is unchanged.</div>';return}
  const chunks=changes.map(([field,updated])=>{
   const prior=before[field]||"";
   return '<div style="border:1px solid #dee8e1;border-radius:9px;padding:12px;margin:10px 0;background:white">'+
    '<label style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><input type="checkbox" checked data-mti-accept="'+esc(field)+'" style="width:auto"><strong>'+esc(MTI_AI_LABELS[field]||field)+'</strong></label>'+
    '<details><summary style="cursor:pointer;font-size:12px">See original text</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 inherit">'+esc(prior)+'</pre></details>'+
    '<p style="font-size:11px;color:#607b6d;font-weight:700;margin:12px 0 5px">PROPOSED TEXT</p>'+
    '<pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 inherit;max-height:250px;overflow:auto">'+esc(updated)+'</pre></div>';
  }).join("");
  target.innerHTML='<div style="padding:10px 0"><strong>Review suggested changes</strong>'+
   '<p style="font-size:12px;margin:7px 0">'+esc(proposal.summary||"AI edit draft")+'</p>'+
   (proposal.warnings?'<p style="color:#995c42;font-size:12px"><strong>Check:</strong> '+esc(proposal.warnings)+'</p>':"")+
   '<p style="font-size:12px;color:#8c5f3a">AI may make mistakes. Check Bible references, titles and all instructions carefully.</p>'+
   chunks+'<button type="button" class="primary" id="mtiApplyAIBtn">Apply selected changes to editor</button>'+
   '<p class="small" style="margin-top:9px">You must still click <strong>Save lesson</strong> to store these changes.</p></div>';
  el("mtiApplyAIBtn").addEventListener("click",applyMTIAIProposal);
 }catch(err){target.innerHTML='<p style="color:#a24b44">'+esc(err.message)+'</p>'}
 finally{all.forEach(b=>b.disabled=false)}
}
function applyMTIAIProposal(){
 const p=MTI_ACTIVE_AI_EDIT;
 if(!p?.proposal?.changes)return;
 const accepted=[];
 for(const [field,value] of Object.entries(p.proposal.changes)){
  const c=document.querySelector('[data-mti-accept="'+field+'"]');
  if(!c?.checked)continue;
  const input=el("f_"+field);
  if(input){input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));accepted.push(MTI_AI_LABELS[field]||field)}
 }
 el("mtiAiPreview").innerHTML=accepted.length?
 '<div class="callout"><strong>Changes applied to the editing form:</strong> '+esc(accepted.join(", "))+
 '. Please inspect the fields above, then click <strong>Save lesson</strong> when satisfied.</div>':
 '<div class="callout">No changes selected.</div>';
}
function startMTIVoice(){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 const status=el("mtiVoiceSupport"),button=el("mtiVoiceBtn");
 if(!Speech){status.textContent="Voice recognition is unavailable in this browser. Type or paste your instruction instead.";return}
 if(MTI_VOICE_RECOGNITION){MTI_VOICE_RECOGNITION.stop();return}
 const recognizer=new Speech();
 recognizer.lang="en-CA";recognizer.continuous=false;recognizer.interimResults=false;
 MTI_VOICE_RECOGNITION=recognizer;
 recognizer.onresult=function(e){
  const transcript=Array.from(e.results).map(r=>r[0].transcript).join(" ").trim();
  const input=el("mtiVoiceCommand");if(input)input.value=(input.value?input.value.trim()+" ":"")+transcript;
  if(status)status.textContent="Transcribed. Review the words above, then click Preview instructed change.";
 };
 recognizer.onerror=function(e){if(status)status.textContent="Voice recognition: "+e.error+". You can still type or paste."};
 recognizer.onend=function(){MTI_VOICE_RECOGNITION=null;if(button)button.textContent="🎙 Speak instruction"};
 if(button)button.textContent="■ Stop listening";
 if(status)status.textContent="Listening… Speak the requested change.";
 try{recognizer.start()}catch(e){MTI_VOICE_RECOGNITION=null;if(status)status.textContent=e.message}
}
