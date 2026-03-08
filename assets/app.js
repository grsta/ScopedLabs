/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller
*/

(() => {
"use strict";

const LS_KEY = "sl_selected_category";
const UPGRADE_PATH = "/upgrade/";
const CHECKOUT_PATH = "/upgrade/checkout/";

let currentCategory = null;
let currentSession = null;

function qs(name){
  try{
    return new URLSearchParams(location.search).get(name);
  }catch{
    return null;
  }
}

function cleanSlug(v){
  if(!v) return null;
  return String(v).trim().toLowerCase().replace(/\s+/g,"-");
}

function getUrlCategory(){
  return cleanSlug(qs("category"));
}

function getStoredCategory(){
  try{
    return cleanSlug(localStorage.getItem(LS_KEY));
  }catch{
    return null;
  }
}

function setStoredCategory(cat){
  try{
    if(cat) localStorage.setItem(LS_KEY,cat);
    else localStorage.removeItem(LS_KEY);
  }catch{}
}

function getResolvedCategory(){
  return getUrlCategory() || getStoredCategory() || null;
}

function isCheckoutPage(){
  return location.pathname.startsWith("/upgrade/checkout");
}

function getEls(){
  return {
    checkoutTitle:document.getElementById("sl-checkout-title"),
    checkoutBtn:document.getElementById("sl-checkout"),
    status:document.getElementById("sl-status"),
    signedIn:document.getElementById("sl-signedin"),
    mustSignin:document.getElementById("sl-must-signin"),
    previewTitle:document.getElementById("sl-preview-title"),
    previewDesc:document.getElementById("sl-preview-desc"),
    previewBullets:document.getElementById("sl-preview-bullets"),
    previewFoot:document.getElementById("sl-preview-foot")
  };
}

/* -----------------------
   CATEGORY META
----------------------- */

const META={
  "physical-security":{
    title:"Physical Security",
    desc:"Coverage planning, system design, and reliability checks.",
    bullets:[
      "System sizing + power checks",
      "Recording/storage planning",
      "Design trade-offs"
    ],
    foot:"You'll also receive future Pro tools added to this category."
  },
  network:{
    title:"Network",
    desc:"Bandwidth planning, latency budgets, and topology checks.",
    bullets:[
      "Bandwidth planner",
      "Latency budget modeling",
      "Oversubscription estimator"
    ],
    foot:"You'll also receive future Pro tools added to this category."
  },
  infrastructure:{
    title:"Infrastructure",
    desc:"Power chain planning, rack layout, and reliability baselines.",
    bullets:[
      "UPS runtime planning",
      "Rack power modeling",
      "Cooling assumptions"
    ],
    foot:"You'll also receive future Pro tools added to this category."
  }
};

function metaFor(cat){
  return META[cat] || {
    title:"None selected",
    desc:"Select a category to see preview.",
    bullets:[],
    foot:""
  };
}

/* -----------------------
   RENDER
----------------------- */

function renderPreview(cat){

  const els=getEls();
  const m=metaFor(cat);

  if(els.previewTitle) els.previewTitle.textContent=m.title;
  if(els.previewDesc) els.previewDesc.textContent=m.desc;

  if(els.previewBullets){
    els.previewBullets.innerHTML="";
    m.bullets.forEach(b=>{
      const li=document.createElement("li");
      li.textContent=b;
      els.previewBullets.appendChild(li);
    });
  }

  if(els.previewFoot) els.previewFoot.textContent=m.foot;
}

function renderTitle(cat){
  const els=getEls();
  const m=metaFor(cat);
  if(els.checkoutTitle) els.checkoutTitle.textContent=`Unlock ${m.title}`;
}

function renderSignedIn(){

  const els=getEls();

  const email=
    currentSession &&
    currentSession.user &&
    currentSession.user.email
      ? currentSession.user.email
      : null;

  if(els.signedIn){
    els.signedIn.textContent=email?`Signed in as ${email}`:"";
    els.signedIn.style.display=email?"":"none";
  }

  if(els.mustSignin){
    els.mustSignin.style.display=email?"none":"";
  }
}

function renderButtons(){

  const els=getEls();

  const signedIn=!!(
    currentSession &&
    currentSession.user &&
    currentSession.user.email
  );

  const hasCategory=!!currentCategory;

  if(els.checkoutBtn && isCheckoutPage()){
    els.checkoutBtn.disabled=!(signedIn && hasCategory);
  }
}

function renderAll(){

  renderTitle(currentCategory);
  renderPreview(currentCategory);
  renderSignedIn();
  renderButtons();

}

/* -----------------------
   CHECKOUT
----------------------- */

async function handleCheckout(){

  const els=getEls();

  const email =
    currentSession &&
    currentSession.user &&
    currentSession.user.email
      ? currentSession.user.email
      : "";

  const user_id =
    currentSession &&
    currentSession.user &&
    currentSession.user.id
      ? currentSession.user.id
      : "";

  if(!email || !currentCategory || !user_id){
    if(els.status){
      els.status.textContent="Missing account info. Please sign in again.";
    }
    renderAll();
    return;
  }

  try{

    if(els.checkoutBtn) els.checkoutBtn.disabled=true;
    if(els.status) els.status.textContent="Opening Stripe Checkout…";

    const response=await fetch("/api/create-checkout-session",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        category:currentCategory,
        email,
        user_id
      })
    });

    let data=null;

    try{
      data=await response.json();
    }catch{
      data=null;
    }

    if(!response.ok){
      throw new Error(
        data && data.error
          ? `bad_status_${response.status}: ${data.error}`
          : `bad_status_${response.status}`
      );
    }

    if(!data || !data.url){
      throw new Error("missing_url");
    }

    location.href=data.url;

  }catch(err){

    console.error("[checkout error]",err);

    if(els.status){
      els.status.textContent =
        err && err.message
          ? `Checkout failed: ${err.message}`
          : "Failed to start checkout";
    }

    if(els.checkoutBtn) els.checkoutBtn.disabled=false;

  }
}

/* -----------------------
   AUTH SYNC
----------------------- */

async function syncSession(){

  const auth=window.SL_AUTH;
  if(!auth) return;

  if(auth.ready) await auth.ready;

  const sb=auth.sb;

  if(!sb) return;

  const {data}=await sb.auth.getSession();

  currentSession=data.session||null;

  renderAll();

}

/* -----------------------
   INIT
----------------------- */

function init(){

  currentCategory=getResolvedCategory();

  setStoredCategory(currentCategory);

  renderAll();

}

function bind(){

  document.addEventListener("click",(e)=>{

    if(e.target.closest("#sl-checkout")){
      e.preventDefault();
      handleCheckout();
    }

  });

}

async function start(){

  bind();

  init();

  await syncSession();

  renderAll();

}

start();

})();