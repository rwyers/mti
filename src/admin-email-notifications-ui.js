/* MTI email notification master switch. All changes are persisted server-side and
   affect the sender itself, not just this browser. */
let MTI_EMAIL_SWITCH_LAST=false;
function showMtiEmailNotificationState(settings){
 const toggle=el("mtiEmailSwitch"),status=el("mtiEmailState"),label=el("mtiEmailSwitchText");
 if(!toggle||!status||!label)return;
 const enabled=settings.enabled===true,ready=settings.delivery_configured===true;
 MTI_EMAIL_SWITCH_LAST=enabled;
 toggle.checked=enabled;toggle.disabled=false;label.textContent=enabled?"ON":"OFF";
 if(!enabled){
  status.style.background="#fff1e8";status.style.borderColor="#ecd2bd";status.style.color="#8c532a";
  status.innerHTML='<strong>OFF — automatic emails are paused.</strong><p style="margin:7px 0 0">You can test lessons, enrollments, submissions and grading without MTI emailing students or administrators. No new notification messages will be queued while this is Off.</p>';
 }else if(ready){
  status.style.background="#eaf5ef";status.style.borderColor="#c1dec9";status.style.color="#275f42";
  status.innerHTML='<strong>ON — automatic notifications are active.</strong><p style="margin:7px 0 0">New assignment, grade, and submission notifications may be sent to their intended recipients.</p>';
 }else{
  status.style.background="#fff4e8";status.style.borderColor="#f0d6ba";status.style.color="#8c532a";
  status.innerHTML='<strong>ON, but email delivery is not connected.</strong><p style="margin:7px 0 0">MTI will not be able to deliver email until the configured sender connection is available.</p>';
 }
 const provider=el("mtiEmailProviderStatus");
 if(provider)provider.textContent=(ready?"Email delivery connection: configured.":"Email delivery connection: not ready.")+
  " Unsent messages waiting: "+(Number(settings.pending)||0)+". Changes are saved for all admins, not just this browser.";
 const error=el("mtiEmailError");if(error)error.textContent="";
}
async function loadEmailNotificationSettings(){
 const toggle=el("mtiEmailSwitch"),status=el("mtiEmailState");
 if(!toggle||!status||!ACCOUNT||!["owner","admin"].includes(ACCOUNT.role))return;
 toggle.disabled=true;
 status.textContent="Checking notification settings…";
 try{
  const settings=await api("/api/admin/email-notifications");
  showMtiEmailNotificationState(settings);
 }catch(err){
  status.textContent="Cannot verify email notification status. The default server-side setting is Off.";
  const error=el("mtiEmailError");if(error)error.textContent=err.message;
  toggle.checked=MTI_EMAIL_SWITCH_LAST;toggle.disabled=true;
 }
}
(function attachMtiEmailNotificationToggle(){
 const toggle=el("mtiEmailSwitch");if(!toggle)return;
 toggle.addEventListener("change",async function(){
  const desired=toggle.checked;
  if(desired&&!confirm("Turn ON MTI email notifications? New assignments, grade results and submissions can trigger real emails to students and administrators. Emails suppressed during development will NOT be replayed.")){
   toggle.checked=MTI_EMAIL_SWITCH_LAST;return;
  }
  toggle.disabled=true;
  const error=el("mtiEmailError"),status=el("mtiEmailState");
  if(error)error.textContent="";
  if(status)status.textContent="Saving notification setting…";
  try{
   const saved=await api("/api/admin/email-notifications",{
    method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({enabled:desired})
   });
   showMtiEmailNotificationState(saved);
  }catch(err){
   toggle.checked=MTI_EMAIL_SWITCH_LAST;toggle.disabled=false;
   if(error)error.textContent="Could not update notification settings: "+err.message;
   await loadEmailNotificationSettings();
  }
 });
})();