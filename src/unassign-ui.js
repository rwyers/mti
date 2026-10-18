/* Delegated click handler for dynamically rendered MTI assignment lists.
 * The server verifies ownership, submission history, and active enrollment
 * before removing anything; the UI always shows a confirmation first. */
(function initUnassignButtons(){
 document.addEventListener("click",async function(e){
  const button=e.target.closest("button[data-unassign-id]");
  if(!button)return;
  e.preventDefault();
  if(button.disabled)return;
  const id=button.dataset.unassignId;
  if(!id)return;
  button.disabled=true;
  const previous=button.textContent;
  button.textContent="Checking…";
  try{
   const info=await api("/api/admin/assignments/"+encodeURIComponent(id)+"/unassign-review");
   if(!info.allowed){
    alert(info.reason||"This assignment cannot be unassigned.");
    return;
   }
   const message="Unassign "+info.title+" from "+info.student_name+"?"+
     (info.remove_enrollment?
       "\n\nThis is the student's current curriculum/year. Since no sessions were completed, the mistaken curriculum/year enrollment will ALSO be removed, preventing the assignment from returning.":
       "\n\nThis will remove the assignment from their student dashboard and the admin Recent assignments list.")+
     "\n\nThis cannot be undone automatically. No submitted or graded work will be deleted.";
   if(!confirm(message))return;
   button.textContent="Unassigning…";
   const result=await api("/api/admin/assignments/"+encodeURIComponent(id)+"/unassign",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirm:true})
   });
   await refresh();
   if(typeof loadPathEnrollments==="function")await loadPathEnrollments();
   alert(result.message||"Assignment unassigned.");
  }catch(error){
   alert(error.message||"Unable to unassign this assignment.");
  }finally{
   button.disabled=false;
   button.textContent=previous;
  }
 });
})();
