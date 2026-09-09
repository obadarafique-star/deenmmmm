const DEMO_USERS = {
  farmer:{id:'farmer01',password:'farmer123',name:'Ravi Kumar'},
  authority:{id:'authority01',password:'admin123',name:'Mandi Authority'},
  buyer:{id:'buyer01',password:'buyer123',name:'Shree Traders'}
};

const crops = {
  Tomato:{base:1850,unit:'quintal',humidity:12,season:'Rabi/Kharif'},
  Onion:{base:2400,unit:'quintal',humidity:15,season:'Rabi/Kharif'},
  Wheat:{base:2550,unit:'quintal',humidity:11,season:'Rabi'},
  Rice:{base:3050,unit:'quintal',humidity:14,season:'Kharif'},
  Maize:{base:2150,unit:'quintal',humidity:13,season:'Kharif'},
  Potato:{base:1750,unit:'quintal',humidity:16,season:'Rabi'}
};

const state = {
  user: JSON.parse(localStorage.getItem('kisan_user')||'null'),
  active:'dashboard',
  records: JSON.parse(localStorage.getItem('kisan_records')||'[]'),
  bids: JSON.parse(localStorage.getItem('kisan_bids')||'[]'),
  notice:'',
  lastPrediction:null
};

function money(n){return '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}
function uid(){return 'KM-'+Date.now().toString().slice(-7)}
function save(){localStorage.setItem('kisan_records',JSON.stringify(state.records));localStorage.setItem('kisan_bids',JSON.stringify(state.bids));}
function setUser(user){state.user=user;localStorage.setItem('kisan_user',JSON.stringify(user));}
function logout(){localStorage.removeItem('kisan_user');state.user=null;render()}

function predictPrice(r){
  const c=crops[r.crop]||{base:2000,unit:'quintal'};
  const q=Math.max(1,Number(r.quantity)||1);
  const humidity=Number(r.humidity)||0;
  let quality={A:1.14,B:1.0,C:.86,D:.70}[r.grade]||1;
  let humidityAdj = humidity<=c.humidity ? 1.03 : 1 - Math.min(.16, (humidity-c.humidity)*.012);
  let arrival = new Date(r.arrival); let hour=arrival.getHours();
  let timeAdj = (hour>=5&&hour<=10)?1.02:0.99;
  let volAdj = q>500 ? .97 : q<50 ? 1.02 : 1;
  let marketAdj = ({Tomato:1.05,Onion:1.02,Wheat:.98,Rice:1.01,Maize:.96,Potato:1.0}[r.crop]||1);
  const point = c.base*quality*humidityAdj*timeAdj*volAdj*marketAdj;
  const low=Math.round(point*.93/50)*50, high=Math.round(point*1.08/50)*50;
  return {low,high,point:Math.round(point),confidence:Math.min(95,Math.round(66 + quality*18 + (humidity<=c.humidity?8:0))),unit:c.unit};
}
function currentPrices(){return Object.entries(crops).map(([crop,c])=>({crop,price:c.base*({Tomato:1.05,Onion:1.02,Wheat:.98,Rice:1.01,Maize:.96,Potato:1}[crop])}));}

function loginView(){
  let role=loginView.role||'farmer';
  return `<div class="login">
    <div class="login-visual"><div class="brand"><div class="logo">🌾</div>KisanMandi AI</div><h1>Fair crop pricing, transparent auctions.</h1><p>A single workspace for farmers, mandi authorities and buyers — from arrival entry and AI-assisted price estimation to bidding and printed sale bills.</p><div class="leafline"><span class="mini">AI price range</span><span class="mini">Auction ledger</span><span class="mini">Farmer history</span><span class="mini">Buyer buying desk</span></div><div style="margin-top:36px;font-size:12px;color:#cde2d3">Prototype • Indicative pricing until a live mandi feed is connected</div></div>
    <div class="login-panel"><div class="login-card"><h2>Sign in</h2><p class="sub">Choose your workspace and enter your credentials.</p>
      <div class="role-tabs">${['farmer','authority','buyer'].map(x=>`<button class="role-tab ${role===x?'active':''}" onclick="loginView.role='${x}';render()">${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}</div>
      <form onsubmit="event.preventDefault();doLogin('${role}')" class="grid" style="gap:14px">
        <div class="field"><label>User ID</label><input id="login-id" required placeholder="Enter user ID" value="${DEMO_USERS[role].id}"></div>
        <div class="field"><label>Password</label><input id="login-pass" type="password" required placeholder="Enter password" value="${DEMO_USERS[role].password}"></div>
        <button class="btn btn-primary" type="submit">Login to ${role} portal</button>
      </form>
      <div class="demo"><b>Demo access:</b> ${DEMO_USERS[role].id} / ${DEMO_USERS[role].password}</div>
    </div></div></div>`;
}
function doLogin(role){const id=document.getElementById('login-id').value, pw=document.getElementById('login-pass').value; const u=DEMO_USERS[role]; if(id===u.id&&pw===u.password){setUser({role,id,name:u.name});state.active='dashboard';render()} else alert('Invalid demo credentials for this portal.');}

function layout(content){
 const role=state.user.role;
 const nav = role==='farmer' ? [['dashboard','Dashboard'],['submit','New Crop Entry'],['history','My History'],['market','Market Analysis'],['suggestions','Crop Suggestions']]
 : role==='authority' ? [['dashboard','Live Mandi Desk'],['auction','Auction & Bids'],['records','Crop Records'],['reports','Reports']]
 : [['dashboard','Buyer Dashboard'],['buying','Buying History'],['market','Current Prices']];
 return `<div class="topbar"><div class="brand"><div class="logo">🌾</div>KisanMandi AI</div><div class="userbar"><span>${state.user.name}</span><span class="rolepill">${role}</span><button class="ghost" onclick="logout()">Logout</button></div></div><div class="shell"><aside class="sidebar">${nav.map(([k,label])=>`<button class="navbtn ${state.active===k?'active':''}" onclick="state.active='${k}';state.notice='';render()">${icon(k)} ${label}</button>`).join('')}</aside><main class="content">${content}<div class="footer">Demo prototype. Connect a verified mandi price feed before production use. Reference systems: e-NAM and Government agriculture portals.</div></main></div>`;
}
function icon(k){return ({dashboard:'◈',submit:'＋',history:'▤',market:'↗',suggestions:'✦',auction:'⌁',records:'▥',reports:'▧',buying:'▤'})[k]||'•'}

function dashboard(){
 const role=state.user.role;
 if(role==='farmer') return farmerDashboard(); if(role==='authority') return authorityDashboard(); return buyerDashboard();
}
function farmerDashboard(){
 const mine=state.records.filter(r=>r.farmerId===state.user.id); const prices=currentPrices();
 return `<div class="page-title"><div><h1>Farmer Dashboard</h1><p>Track your crop arrivals, predicted prices and realized selling values.</p></div><button class="btn btn-primary" onclick="state.active='submit';render()">＋ New Crop Entry</button></div>
 <div class="grid grid-4">${[['Total lots',mine.length,'All submitted arrivals'],['Latest price',mine[0]?money((mine[0].finalPrice||mine[0].prediction.point)):'—','Per quintal'],['Lots sold',mine.filter(r=>r.finalPrice).length,'Completed sales'],['Avg. quality',mine.length?(mine.reduce((a,r)=>a+({A:4,B:3,C:2,D:1}[r.grade]||0),0)/mine.length).toFixed(1)+' / 4':'—','Grade score']].map(x=>`<div class="card stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="delta">${x[2]}</div></div>`).join('')}</div>
 <div class="grid grid-2" style="margin-top:18px"><div class="card hero"><h2>Today's indicative market board</h2><p>Use this as a market signal, not a guaranteed quote.</p><div class="bars" style="margin-top:15px">${prices.map((p,i)=>`<div class="barrow"><span>${p.crop}</span><div class="bar"><span style="width:${55+i*7}%"></span></div><b>${money(p.price)}</b></div>`).join('')}</div></div>
 <div class="card"><div class="section-head"><h3>Recent activity</h3><button class="btn btn-secondary" onclick="state.active='history';render()">View all</button></div>${mine.slice(0,4).map(r=>`<div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line)"><div><b>${r.crop}</b><div class="muted" style="font-size:12px">${r.quantity} q • Grade ${r.grade}</div></div><div style="text-align:right"><b>${money(r.prediction.low)}–${money(r.prediction.high)}</b><div class="muted" style="font-size:12px">${r.finalPrice?money(r.finalPrice)+' sold':'Predicted'}</div></div></div>`).join('')||'<div class="empty">No entries yet. Add your first crop arrival.</div>'}</div></div>`;
}
function authorityDashboard(){
 const active=state.records.filter(r=>!r.finalPrice).length,total=state.records.reduce((a,r)=>a+r.quantity,0),sold=state.records.filter(r=>r.finalPrice).length;
 return `<div class="page-title"><div><h1>Live Mandi Desk</h1><p>Authority view of crop arrivals, price estimates and auction outcomes.</p></div><span class="badge badge-green">LIVE WORKSPACE</span></div>
 <div class="grid grid-4">${[['Arrivals today',state.records.length,'Recorded lots'],['Open auctions',active,'Awaiting final price'],['Quantity received',total.toLocaleString('en-IN')+' q','Across all lots'],['Completed sales',sold,'Bills can be printed']].map(x=>`<div class="card stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="delta">${x[2]}</div></div>`).join('')}</div>
 <div class="grid grid-2" style="margin-top:18px"><div class="card"><div class="section-head"><h3>Incoming lots</h3><button class="btn btn-secondary" onclick="state.active='records';render()">Open records</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Lot</th><th>Farmer</th><th>Crop</th><th>Grade</th><th>AI range</th><th>Status</th></tr></thead><tbody>${state.records.slice(-8).reverse().map(r=>`<tr><td>${r.id}</td><td>${r.farmerName}</td><td>${r.crop}</td><td>${r.grade}</td><td>${money(r.prediction.low)}–${money(r.prediction.high)}</td><td><span class="badge ${r.finalPrice?'badge-green':'badge-amber'}">${r.finalPrice?'Sold':'Open'}</span></td></tr>`).join('')||'<tr><td colspan="6" class="empty">No crop records yet.</td></tr>'}</tbody></table></div></div>
 <div class="card"><div class="section-head"><h3>Authority controls</h3></div><div class="success">The price estimator is deterministic and explainable for this prototype: base commodity signal × grade × humidity fit × arrival timing × lot-volume factor.</div><div style="height:16px"></div><div class="notice">For production, replace demo base prices with authenticated e-NAM/APMC or another verified market feed, then retrain/validate the model on historical mandi transactions.</div></div></div>`;
}
function buyerDashboard(){
 const mine=state.bids.filter(b=>b.buyerId===state.user.id);
 return `<div class="page-title"><div><h1>Buyer Dashboard</h1><p>Monitor current crop quotes and your buying history.</p></div><button class="btn btn-primary" onclick="state.active='market';render()">View Current Prices</button></div>
 <div class="grid grid-4">${[['Active bids',mine.filter(b=>!b.finalPrice).length,'Open buyer activity'],['Lots won',mine.filter(b=>b.finalPrice).length,'Completed buys'],['Buying volume',mine.reduce((a,b)=>a+(b.quantity||0),0)+' q','Recorded quantity'],['Avg. buy price',mine.length?money(mine.reduce((a,b)=>a+(b.finalPrice||b.initialBid||0),0)/mine.length):'—','Per quintal']].map(x=>`<div class="card stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="delta">${x[2]}</div></div>`).join('')}</div>
 <div class="card" style="margin-top:18px"><div class="section-head"><h3>Current crop prices</h3><span class="muted" style="font-size:12px">Indicative demo board</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Crop</th><th>Indicative price</th><th>Season</th><th>Action</th></tr></thead><tbody>${currentPrices().map(p=>`<tr><td><b>${p.crop}</b></td><td>${money(p.price)}/q</td><td>${crops[p.crop].season}</td><td><button class="btn btn-secondary" onclick="state.active='market';render()">Browse lots</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function submitPage(){
 return `<div class="page-title"><div><h1>New Crop Entry</h1><p>Enter arrival details to generate an indicative AI-assisted price range.</p></div></div>${state.notice?`<div class="success" style="margin-bottom:16px">${state.notice}</div>`:''}
 <div class="grid grid-2"><div class="card"><div class="formgrid"><div class="field"><label>Farmer name</label><input id="farmerName" value="${state.user.name}"></div><div class="field"><label>Crop name</label><select id="cropName">${Object.keys(crops).map(c=>`<option>${c}</option>`).join('')}</select></div><div class="field"><label>Crop quantity (quintals)</label><input id="quantity" type="number" min="1" value="120"></div><div class="field"><label>Humidity (%)</label><input id="humidity" type="number" min="0" max="100" value="12"></div><div class="field"><label>Arrival date & time</label><input id="arrival" type="datetime-local" value="${new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)}"></div><div class="field"><label>Crop quality grade</label><select id="grade"><option value="A">A — Premium</option><option value="B">B — Good</option><option value="C">C — Standard</option><option value="D">D — Below standard</option></select></div></div><div style="height:18px"></div><button class="btn btn-primary" onclick="generatePrediction()">Generate Price Range</button></div>
 <div class="card hero">${state.lastPrediction?predictionPanel():'<div class="empty"><div style="font-size:38px">◌</div><h3 style="color:var(--ink)">Price prediction</h3><p>Submit the crop details to see a transparent low/high range, confidence score and factors used.</p></div>'}</div></div>`;
}
function generatePrediction(){
 const r={farmerName:val('farmerName'),farmerId:state.user.id,crop:val('cropName'),quantity:Number(val('quantity')),humidity:Number(val('humidity')),arrival:val('arrival'),grade:val('grade')};
 r.id=uid();r.prediction=predictPrice(r);state.lastPrediction=r;state.records.push(r);save();state.notice='Price range generated and saved to your mandi record.';render();
}
function predictionPanel(){const p=state.lastPrediction.prediction,r=state.lastPrediction;return `<div><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="muted" style="font-size:12px">${r.crop} • Grade ${r.grade} • ${r.quantity} q</div><h2 style="margin:6px 0 3px">${money(p.low)} – ${money(p.high)} / quintal</h2><div class="muted" style="font-size:13px">Estimated midpoint ${money(p.point)} • ${p.confidence}% model confidence</div></div><span class="badge badge-green">AI ESTIMATE</span></div><div class="grid grid-2" style="margin-top:18px"><div class="card" style="box-shadow:none"><div class="label">Initial bidding amount</div><div class="field" style="margin-top:9px"><input id="initialBid" type="number" value="${p.point}"></div></div><div class="card" style="box-shadow:none"><div class="label">Final bidding / selling price</div><div class="field" style="margin-top:9px"><input id="finalPrice" type="number" placeholder="Enter after auction"></div></div></div><div style="height:15px"></div><button class="btn btn-primary" onclick="saveSale('${r.id}')">Save Auction Result</button> <button class="btn btn-secondary" onclick="printBill('${r.id}')">Print Bill</button><div class="notice" style="margin-top:15px">Model factors: commodity baseline, quality grade, humidity fit, arrival time, and lot size. This demo does not pull live mandi prices.</div></div>`}
function val(id){return document.getElementById(id).value}
function saveSale(id){const r=state.records.find(x=>x.id===id);if(!r)return; r.initialBid=Number(document.getElementById('initialBid').value);r.finalPrice=Number(document.getElementById('finalPrice').value)||0; r.soldAt=r.finalPrice?new Date().toISOString():null; if(r.finalPrice&&!state.bids.find(b=>b.recordId===id)){state.bids.push({recordId:id,buyerId:'buyer01',buyerName:'Buyer Desk',crop:r.crop,quantity:r.quantity,initialBid:r.initialBid,finalPrice:r.finalPrice,createdAt:r.arrival});} save(); state.active='history';state.notice=r.finalPrice?'Sale saved successfully.':'Initial bid saved; final sale price is still open.';render()}
function printBill(id){window.open('bill.html?id='+encodeURIComponent(id),'_blank')}

function historyPage(){const mine=state.records.filter(r=>r.farmerId===state.user.id).reverse();return `<div class="page-title"><div><h1>My History</h1><p>Every crop arrival and sale recorded under your farmer account.</p></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Lot</th><th>Date</th><th>Crop</th><th>Qty</th><th>Grade</th><th>AI range</th><th>Final price</th><th>Bill</th></tr></thead><tbody>${mine.map(r=>`<tr><td>${r.id}</td><td>${new Date(r.arrival).toLocaleString('en-IN')}</td><td>${r.crop}</td><td>${r.quantity}</td><td>${r.grade}</td><td>${money(r.prediction.low)}–${money(r.prediction.high)}</td><td>${r.finalPrice?money(r.finalPrice):'—'}</td><td>${r.finalPrice?`<button class="btn btn-secondary" onclick="printBill('${r.id}')">Print</button>`:'<span class="muted">Open</span>'}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">No history yet.</td></tr>'}</tbody></table></div></div>`}
function marketPage(){return `<div class="page-title"><div><h1>Market Analysis</h1><p>Compare indicative prices, crop seasonality and observed lot activity.</p></div></div><div class="grid grid-2"><div class="card"><div class="section-head"><h3>Indicative prices</h3></div><div class="bars">${currentPrices().sort((a,b)=>b.price-a.price).map((p,i)=>`<div class="barrow"><span>${p.crop}</span><div class="bar"><span style="width:${45+i*9}%"></span></div><b>${money(p.price)}</b></div>`).join('')}</div></div><div class="card"><div class="section-head"><h3>Your recorded lots by crop</h3></div>${Object.keys(crops).map(c=>{const n=state.records.filter(r=>r.farmerId===state.user.id&&r.crop===c).length;return `<div style="display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--line)"><span>${c}</span><b>${n} lot${n===1?'':'s'}</b></div>`}).join('')}</div></div><div class="card" style="margin-top:18px"><div class="notice"><b>Interpretation:</b> a higher predicted band is associated in this prototype with better quality, suitable humidity, smaller/normal lot size and the crop's demo market factor. For a production decision tool, historical APMC/e-NAM transactions and local agronomic/seasonal variables should be used to train and validate the model.</div></div>`}
function suggestionsPage(){return `<div class="page-title"><div><h1>Crop Suggestions</h1><p>Simple rotation and market-signal suggestions for the next planning cycle.</p></div></div><div class="grid grid-3">${[['Wheat','Strong demo price signal','Good fit for Rabi conditions'],['Rice','Stable demo signal','Consider only where water availability supports it'],['Onion','Higher demo value','Monitor storage and quality risk']].map((x,i)=>`<div class="card"><div class="kpi-icon">✦</div><h3>${x[0]}</h3><div class="badge ${i===1?'badge-green':'badge-amber'}">${x[1]}</div><p class="muted" style="line-height:1.5">${x[2]}.</p><button class="btn btn-secondary" onclick="state.active='market';render()">View market signal</button></div>`).join('')}</div><div class="notice" style="margin-top:18px">This recommendation layer is a prototype, not agronomic advice. Add soil, water, weather, sowing window and verified local price history before using it for real crop planning.</div>`}

function authorityPage(){if(state.active==='auction')return auctionPage();if(state.active==='records')return recordsPage();if(state.active==='reports')return reportsPage();return dashboard()}
function auctionPage(){return `<div class="page-title"><div><h1>Auction & Bids</h1><p>Review open lots, initial bids and final selling prices.</p></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Lot</th><th>Farmer</th><th>Crop</th><th>AI range</th><th>Initial bid</th><th>Final</th><th>Action</th></tr></thead><tbody>${state.records.filter(r=>!r.finalPrice).map(r=>`<tr><td>${r.id}</td><td>${r.farmerName}</td><td>${r.crop}</td><td>${money(r.prediction.low)}–${money(r.prediction.high)}</td><td><input id="ib-${r.id}" type="number" value="${r.initialBid||r.prediction.point}" style="width:110px;padding:8px;border:1px solid var(--line);border-radius:8px"></td><td><input id="fp-${r.id}" type="number" placeholder="Final" style="width:110px;padding:8px;border:1px solid var(--line);border-radius:8px"></td><td><button class="btn btn-primary" onclick="authorityClose('${r.id}')">Close sale</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No open lots.</td></tr>'}</tbody></table></div></div>`}
function authorityClose(id){const r=state.records.find(x=>x.id===id);r.initialBid=Number(document.getElementById('ib-'+id).value);r.finalPrice=Number(document.getElementById('fp-'+id).value);if(!r.finalPrice)return alert('Enter a final selling price.');r.soldAt=new Date().toISOString();state.bids.push({recordId:id,buyerId:'buyer01',buyerName:'Buyer Desk',crop:r.crop,quantity:r.quantity,initialBid:r.initialBid,finalPrice:r.finalPrice,createdAt:r.arrival});save();state.notice='Sale closed and recorded.';render()}
function recordsPage(){return `<div class="page-title"><div><h1>Crop Records</h1><p>Authority-wide record book for current prototype data.</p></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Lot</th><th>Farmer</th><th>Crop</th><th>Humidity</th><th>Grade</th><th>Quantity</th><th>Status</th></tr></thead><tbody>${state.records.map(r=>`<tr><td>${r.id}</td><td>${r.farmerName}</td><td>${r.crop}</td><td>${r.humidity}%</td><td>${r.grade}</td><td>${r.quantity} q</td><td><span class="badge ${r.finalPrice?'badge-green':'badge-amber'}">${r.finalPrice?'Sold':'Open'}</span></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No records.</td></tr>'}</tbody></table></div></div>`}
function reportsPage(){const sold=state.records.filter(r=>r.finalPrice),rev=sold.reduce((a,r)=>a+r.finalPrice*r.quantity,0),avg=sold.length?sold.reduce((a,r)=>a+r.finalPrice,0)/sold.length:0;return `<div class="page-title"><div><h1>Reports</h1><p>Summary of activity in the local browser demo.</p></div></div><div class="grid grid-3"><div class="card stat"><div class="label">Completed sales</div><div class="value">${sold.length}</div></div><div class="card stat"><div class="label">Gross trade value</div><div class="value">${money(rev)}</div></div><div class="card stat"><div class="label">Average sale price</div><div class="value">${money(avg)}</div></div></div><div class="card" style="margin-top:18px"><div class="section-head"><h3>Source & production-readiness notes</h3></div><p class="muted" style="line-height:1.65">e-NAM describes its platform as a pan-India electronic trading network intended to promote transparency, reduce information asymmetry and support real-time price discovery. This prototype mirrors those workflow concepts, but uses local demo data in the browser. Government agriculture platforms also demonstrate multi-stakeholder access and integrated digital records.</p><p><a class="source-link" href="https://enam.gov.in/" target="_blank">e-NAM official portal</a> · <a class="source-link" href="https://pmfby.gov.in/" target="_blank">PMFBY official portal</a></p></div>`}
function buyerPage(){if(state.active==='buying')return buyingPage();if(state.active==='market')return buyerMarketPage();return dashboard()}
function buyingPage(){const mine=state.bids.filter(b=>b.buyerId===state.user.id);return `<div class="page-title"><div><h1>Buying History</h1><p>Completed and active purchasing records.</p></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Lot</th><th>Crop</th><th>Qty</th><th>Initial bid</th><th>Final price</th><th>Date</th></tr></thead><tbody>${mine.map(b=>`<tr><td>${b.recordId}</td><td>${b.crop}</td><td>${b.quantity} q</td><td>${money(b.initialBid)}</td><td>${b.finalPrice?money(b.finalPrice):'—'}</td><td>${new Date(b.createdAt).toLocaleString('en-IN')}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No purchases yet.</td></tr>'}</tbody></table></div></div>`}
function buyerMarketPage(){return `<div class="page-title"><div><h1>Current Prices</h1><p>Indicative board to guide current buying decisions.</p></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Commodity</th><th>Indicative price / q</th><th>Quality note</th><th>Trend</th></tr></thead><tbody>${currentPrices().map((p,i)=>`<tr><td><b>${p.crop}</b></td><td>${money(p.price)}</td><td>${i%2?'Grade A/B preferred':'Grade A strongly preferred'}</td><td><span class="badge ${i%2?'badge-amber':'badge-green'}">${i%2?'Stable':'Firm'}</span></td></tr>`).join('')}</tbody></table></div></div><div class="notice" style="margin-top:18px">All prices in this demo are indicative only. A production version should pull authenticated, timestamped mandi observations and display the source and freshness for every quote.</div>`}

function render(){const root=document.getElementById('app'); if(!state.user){root.innerHTML=loginView();return;} let c=''; const role=state.user.role; if(state.active==='dashboard')c=dashboard(); else if(role==='farmer'){c=state.active==='submit'?submitPage():state.active==='history'?historyPage():state.active==='market'?marketPage():state.active==='suggestions'?suggestionsPage():dashboard();} else if(role==='authority'){c=authorityPage()} else {c=buyerPage()}; root.innerHTML=layout(c)}

window.loginView=loginView;window.render=render;window.doLogin=doLogin;window.logout=logout;window.generatePrediction=generatePrediction;window.saveSale=saveSale;window.printBill=printBill;window.authorityClose=authorityClose;
render();
