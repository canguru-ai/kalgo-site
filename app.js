/* Kalgo demo engine — synthetic data, charts, live metrics, scrubber.
   Author: Keihan Infantes. Illustrative demo data only. */
(function () {
  "use strict";
  if (!window.LightweightCharts) { console.error("charts lib missing"); return; }
  const LWC = window.LightweightCharts;

  // ---- deterministic RNG so the demo looks identical every visit ----
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  const rnd = mulberry32(20260918);
  const gauss = () => { let u=0,v=0; while(!u)u=rnd(); while(!v)v=rnd(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };

  // ---- business-day date axis (~3.2 years) ----
  const N = 820;
  const dates = [];
  { const d = new Date(Date.UTC(2023, 0, 3));
    while (dates.length < N) { const wd = d.getUTCDay(); if (wd!==0 && wd!==6) dates.push(d.toISOString().slice(0,10)); d.setUTCDate(d.getUTCDate()+1); } }
  const fmtDate = s => new Date(s+"T00:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});

  // ---- synthetic OHLC (mild upward drift) ----
  const candles = [];
  let px = 1.052; const mu = 0.00019, sig = 0.0062;
  for (let i=0;i<N;i++){
    const open = px;
    const ret = mu + sig*gauss();
    const close = +(open*(1+ret)).toFixed(5);
    const hi = +(Math.max(open,close)*(1+Math.abs(sig*0.6*rnd()))).toFixed(5);
    const lo = +(Math.min(open,close)*(1-Math.abs(sig*0.6*rnd()))).toFixed(5);
    candles.push({time:dates[i],open:+open.toFixed(5),high:hi,low:lo,close});
    px = close;
  }

  // ---- synthetic trades ----
  const trades = [];
  const SIZE = 25000;
  let i = 8;
  while (i < N-6 && trades.length < 130){
    i += 2 + Math.floor(rnd()*7);                 // gap between trades
    if (i >= N-6) break;
    const hold = 1 + Math.floor(rnd()*14);
    const exitIdx = Math.min(i+hold, N-1);
    const long = rnd() > 0.32;                     // ~68% longs (uptrend context)
    const entry = candles[i].close, exit = candles[exitIdx].close;
    const dir = long ? 1 : -1;
    const pnl = +((exit-entry)*SIZE*dir).toFixed(2);
    trades.push({entryIdx:i, exitIdx, entryDate:dates[i], exitDate:dates[exitIdx], side:long?"long":"short", entry, exit, size:SIZE, pnl, win:pnl>=0});
    i = exitIdx;
  }

  // ---- full equity-by-date (cumulative realized P&L) ----
  const equityFull = [];
  { let cum=0, t=0;
    for (let d=0; d<N; d++){
      while (t<trades.length && trades[t].exitIdx===d){ cum+=trades[t].pnl; t++; }
      equityFull.push({time:dates[d], value:+cum.toFixed(2)});
    } }

  // ---- charts ----
  const baseLayout = { layout:{background:{color:"#0f1218"},textColor:"#8b95a5",fontFamily:"'JetBrains Mono',monospace",fontSize:11},
    grid:{vertLines:{color:"rgba(255,255,255,.04)"},horzLines:{color:"rgba(255,255,255,.05)"}},
    rightPriceScale:{borderColor:"rgba(255,255,255,.08)"},
    timeScale:{borderColor:"rgba(255,255,255,.08)"},
    crosshair:{mode:LWC.CrosshairMode.Normal,vertLine:{color:"rgba(52,227,155,.4)",labelBackgroundColor:"#1a212b"},horzLine:{color:"rgba(52,227,155,.4)",labelBackgroundColor:"#1a212b"}},
    autoSize:true };

  const priceChart = LWC.createChart(document.getElementById("price-chart"), baseLayout);
  const candleSeries = priceChart.addCandlestickSeries({upColor:"#2fd39b",downColor:"#e0566a",wickUpColor:"#2fd39b",wickDownColor:"#e0566a",borderVisible:false});
  candleSeries.setData(candles);

  const eqChart = LWC.createChart(document.getElementById("equity-chart"), baseLayout);
  const eqSeries = eqChart.addAreaSeries({lineColor:"#34e39b",lineWidth:2,topColor:"rgba(52,227,155,.28)",bottomColor:"rgba(52,227,155,0)",priceFormat:{type:"custom",formatter:v=>"$"+Math.round(v/1000)+"k"}});
  eqSeries.setData(equityFull);

  // ---- helpers ----
  const $ = id => document.getElementById(id);
  const money = v => (v<0?"-":"+")+"$"+Math.abs(Math.round(v)).toLocaleString("en-US");
  function markersUpTo(idx){
    const m=[];
    for(const tr of trades){
      if(tr.entryIdx>idx) continue;
      m.push({time:tr.entryDate,position:tr.side==="long"?"belowBar":"aboveBar",
        color:tr.side==="long"?"#2fd39b":"#28c9ff",shape:tr.side==="long"?"arrowUp":"arrowDown"});
      if(tr.exitIdx<=idx) m.push({time:tr.exitDate,position:"aboveBar",color:tr.win?"#2fd39b":"#ff5f6d",shape:"circle"});
    }
    return m.sort((a,b)=>a.time<b.time?-1:1);
  }
  function metricsUpTo(idx){
    const closed = trades.filter(t=>t.exitIdx<=idx);
    const n=closed.length;
    if(!n) return null;
    const wins=closed.filter(t=>t.win), losses=closed.filter(t=>!t.win);
    const net=closed.reduce((s,t)=>s+t.pnl,0);
    const grossW=wins.reduce((s,t)=>s+t.pnl,0), grossL=Math.abs(losses.reduce((s,t)=>s+t.pnl,0));
    const avgW=wins.length?grossW/wins.length:0, avgL=losses.length?grossL/losses.length:0;
    // max drawdown on realized equity up to idx
    let peak=-Infinity, dd=0, cum=0;
    for(const t of closed){ cum+=t.pnl; peak=Math.max(peak,cum); dd=Math.min(dd,cum-peak); }
    return {n, wr:wins.length/n*100, pf:grossL?grossW/grossL:Infinity, exp:net/n, dd, avgW, avgL, net};
  }
  function paint(idx){
    const asof = dates[idx];
    candleSeries.setMarkers(markersUpTo(idx));
    eqSeries.setData(equityFull.slice(0, idx+1));
    const m = metricsUpTo(idx);
    $("asof").textContent = "as of "+fmtDate(asof);
    $("scrub-date").textContent = fmtDate(asof);
    if(!m){ ["m-pnl","m-wr","m-pf","m-exp","m-dd","m-awl"].forEach(x=>$(x).textContent="—"); $("ntrades").textContent="no closed trades yet"; return; }
    $("ntrades").textContent = m.n+" trades";
    const pnlEl=$("m-pnl"); pnlEl.textContent=money(m.net); pnlEl.style.color=m.net>=0?"#2fd39b":"#ff5f6d";
    $("m-wr").textContent=m.wr.toFixed(1)+"%";
    $("m-pf").textContent=isFinite(m.pf)?m.pf.toFixed(2):"∞";
    const expEl=$("m-exp"); expEl.textContent=money(m.exp)+"/trade"; expEl.style.color=m.exp>=0?"#2fd39b":"#ff5f6d";
    $("m-dd").textContent=money(m.dd);
    $("m-awl").textContent="+$"+Math.round(m.avgW)+" / -$"+Math.round(m.avgL);
  }

  // ---- scrubber ----
  const scrub = $("scrub");
  function onScrub(){
    const idx = Math.round(scrub.value/100*(N-1));
    scrub.style.setProperty("--pct", scrub.value+"%");
    paint(idx);
  }
  scrub.addEventListener("input", onScrub);

  // initial render
  priceChart.timeScale().fitContent();
  eqChart.timeScale().fitContent();
  // keep the two time axes aligned when either is zoomed/panned
  let syncing=false;
  function sync(from,to){ from.timeScale().subscribeVisibleLogicalRangeChange(r=>{ if(syncing||!r)return; syncing=true; to.timeScale().setVisibleLogicalRange(r); syncing=false; }); }
  sync(priceChart,eqChart); sync(eqChart,priceChart);
  scrub.style.setProperty("--pct","100%");
  paint(N-1);
})();
