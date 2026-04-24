const £ = n => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(Number(n)||0);
const els = {};
["customerName","phone","email","surveyor","address","discountPct","vatPct","quoteRef","lineItems","totalIncVat","discountableSubtotal","nonDiscountableSubtotal","minUplift","discountValue","netAfterDiscount","vatValue","flags","quoteText"].forEach(id=>els[id]=document.getElementById(id));
let quoteRef = localStorage.getItem("quoteRef") || makeRef();
els.quoteRef.textContent = quoteRef;

function makeRef(){
  const d = new Date();
  const pad = x => String(x).padStart(2,"0");
  return `${pad(d.getDate())}${pad(d.getMonth()+1)}${String(d.getFullYear()).slice(-2)}-${Math.floor(100+Math.random()*900)}`;
}
function serviceOptions(selected=""){
  return `<option value="">Select service…</option>` + PRICE_GUIDE.map(s => `<option ${s.service===selected?"selected":""}>${s.service}</option>`).join("");
}
function addLine(item={}){
  const tpl = document.getElementById("lineTemplate").content.cloneNode(true);
  const card = tpl.querySelector(".line-card");
  const service = tpl.querySelector(".service");
  service.innerHTML = serviceOptions(item.service);
  tpl.querySelector(".notes").value = item.notes || "";
  tpl.querySelector(".qty").value = item.qty ?? 1;
  tpl.querySelector(".override").value = item.override || "";
  tpl.querySelector(".remove").onclick = () => { card.remove(); update(); };
  card.querySelectorAll("input,select").forEach(x => x.addEventListener("input", update));
  els.lineItems.appendChild(tpl);
  update();
}
function lineData(card){
  const serviceName = card.querySelector(".service").value;
  const svc = PRICE_GUIDE.find(s => s.service === serviceName);
  const qty = parseFloat(card.querySelector(".qty").value) || 0;
  const override = parseFloat(card.querySelector(".override").value);
  const rate = Number.isFinite(override) ? override : (svc?.rate || 0);
  const subtotal = qty * rate;
  const uplift = svc?.minCharge ? Math.max(0, svc.minCharge - subtotal) : 0;
  return {svc, serviceName, notes:card.querySelector(".notes").value, qty, rate, subtotal, uplift, total:subtotal+uplift};
}
function update(){
  let lines = [...els.lineItems.querySelectorAll(".line-card")].map(lineData).filter(x=>x.serviceName);
  [...els.lineItems.querySelectorAll(".line-card")].forEach(card=>{
    const d = lineData(card);
    card.querySelector(".line-title").textContent = d.serviceName || "Service";
    card.querySelector(".unit").textContent = d.svc ? d.svc.unit : "";
    card.querySelector(".rate").textContent = d.svc ? `Rate: ${£(d.rate)}` : "";
    card.querySelector(".line-total").textContent = d.svc ? £(d.total) : "";
    card.querySelector(".line-note").textContent = d.svc ? `${d.svc.notes}${d.uplift ? " • Minimum-charge uplift added" : ""}${d.svc.nonDiscountable ? " • Non-discountable" : ""}` : "";
  });
  const discountable = lines.filter(x=>!x.svc.nonDiscountable).reduce((a,x)=>a+x.total,0);
  const nonDiscountable = lines.filter(x=>x.svc.nonDiscountable).reduce((a,x)=>a+x.total,0);
  const uplift = lines.reduce((a,x)=>a+x.uplift,0);
  const discount = discountable * ((parseFloat(els.discountPct.value)||0)/100);
  const net = discountable + nonDiscountable - discount;
  const vat = net * ((parseFloat(els.vatPct.value)||0)/100);
  const total = net + vat;
  els.discountableSubtotal.textContent = £(discountable);
  els.nonDiscountableSubtotal.textContent = £(nonDiscountable);
  els.minUplift.textContent = £(uplift);
  els.discountValue.textContent = £(discount);
  els.netAfterDiscount.textContent = £(net);
  els.vatValue.textContent = £(vat);
  els.totalIncVat.textContent = £(total);
  const flags = [];
  if(lines.some(x=>["Cream Damp Proof Course","DPC Plus"].includes(x.serviceName))) flags.push("Check manual rate entry for DPC items.");
  if(lines.some(x=>x.serviceName.startsWith("Basement & Cellars"))) flags.push("Basement / cellar work requires management review before issue.");
  if(lines.some(x=>x.svc.nonDiscountable)) flags.push("Non-discountable extras included.");
  if(uplift>0) flags.push("Minimum-charge uplift applied.");
  els.flags.innerHTML = flags.map(f=>`<div class="flag">${f}</div>`).join("");
  const quote = buildQuote(lines, {discountable, nonDiscountable, discount, net, vat, total});
  els.quoteText.innerHTML = quote.html;
  localStorage.setItem("quoteDraft", JSON.stringify(readState()));
}
function buildQuote(lines, totals){
  const customer = els.customerName.value || "Customer";
  const date = new Date().toLocaleDateString("en-GB");
  const rows = lines.map(x=>`<tr><td>${x.serviceName}</td><td>${x.notes||""}</td><td>${x.qty}</td><td>${£(x.rate)}</td><td>${£(x.total)}</td></tr>`).join("");
  const text = `HOME ENERGY SAVE GB LTD QUOTE
Quote Ref: ${quoteRef}
Date: ${date}
Customer: ${customer}
Address: ${els.address.value || ""}
Phone: ${els.phone.value || ""}

Services:
${lines.map(x=>`- ${x.serviceName}${x.notes ? " ("+x.notes+")" : ""}: qty ${x.qty} @ ${£(x.rate)} = ${£(x.total)}`).join("\n")}

Net after discount: ${£(totals.net)}
VAT: ${£(totals.vat)}
Total inc VAT: ${£(totals.total)}

Notes: Prices are based on the 2026 guide and survey information. Manual-rate items and basement/cellar work require management review before issue.`;
  const html = `<p><strong>Quote Ref:</strong> ${quoteRef}<br><strong>Date:</strong> ${date}<br><strong>Customer:</strong> ${customer}<br><strong>Address:</strong> ${els.address.value||""}<br><strong>Phone:</strong> ${els.phone.value||""}</p><table><thead><tr><th>Service</th><th>Notes</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Net after discount:</strong> ${£(totals.net)}<br><strong>VAT:</strong> ${£(totals.vat)}<br><strong>Total inc VAT:</strong> ${£(totals.total)}</p>`;
  return {text, html};
}
function readState(){
  return {
    quoteRef,
    fields:["customerName","phone","email","surveyor","address","discountPct","vatPct"].reduce((a,id)=>(a[id]=els[id].value,a),{}),
    lines:[...els.lineItems.querySelectorAll(".line-card")].map(card=>({service:card.querySelector(".service").value, notes:card.querySelector(".notes").value, qty:card.querySelector(".qty").value, override:card.querySelector(".override").value}))
  };
}
function loadState(){
  const saved = JSON.parse(localStorage.getItem("quoteDraft") || "null");
  if(saved){
    quoteRef = saved.quoteRef || quoteRef;
    els.quoteRef.textContent = quoteRef;
    Object.entries(saved.fields||{}).forEach(([k,v])=>{ if(els[k]) els[k].value=v; });
    (saved.lines||[]).forEach(addLine);
  }
  if(!els.lineItems.children.length) addLine();
  update();
}
document.getElementById("addLineBtn").onclick = () => addLine();
document.getElementById("newQuoteBtn").onclick = () => {
  localStorage.removeItem("quoteDraft");
  quoteRef = makeRef();
  localStorage.setItem("quoteRef", quoteRef);
  els.quoteRef.textContent = quoteRef;
  ["customerName","phone","email","surveyor","address"].forEach(id=>els[id].value="");
  els.discountPct.value=0; els.vatPct.value=20; els.lineItems.innerHTML=""; addLine(); update();
};
document.getElementById("printBtn").onclick = () => window.print();
document.getElementById("shareBtn").onclick = async () => {
  update();
  const text = els.quoteText.innerText;
  if(navigator.share) await navigator.share({title:`Quote ${quoteRef}`, text});
  else navigator.clipboard.writeText(text).then(()=>alert("Quote copied. Paste it into WhatsApp, SMS, or email."));
};
document.getElementById("emailBtn").onclick = () => {
  update();
  const body = encodeURIComponent(els.quoteText.innerText);
  const to = encodeURIComponent(els.email.value || "");
  window.location.href = `mailto:${to}?subject=${encodeURIComponent("Home Energy Save GB Quote "+quoteRef)}&body=${body}`;
};
["customerName","phone","email","surveyor","address","discountPct","vatPct"].forEach(id=>els[id].addEventListener("input", update));
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
loadState();
