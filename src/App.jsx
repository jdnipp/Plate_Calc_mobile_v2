import React,{useEffect,useMemo,useState} from "react";

const SETUPS={
  acuostandard:{name:"ACUO Standard",unit:"lb",bar:45,collar:0,plates:[45,25,15,10,5,2.5],inventory:{45:12,25:6,15:4,10:6,5:6,2.5:4},favorites:[95,135,155,185,205,225,275,315],target:185,barOptions:[25,35,45]},
  competitionkg:{name:"Competition KG",unit:"kg",bar:20,collar:0,plates:[25,20,15,10,5,2.5,1.25],inventory:{25:10,20:2,15:2,10:4,5:4,2.5:4,1.25:4},favorites:[60,80,100,120,140],target:100,barOptions:[15,20]}
};
const STORAGE={favorites:"acuo-favorites",setup:"acuo-setup",inventory:"acuo-inventory"};

const fmt=(v)=>Number.isInteger(v)?String(v):String(v).replace(/\.0$/,"");
const parsePlates=(s)=>s.split(",").map(x=>Number(x.trim())).filter(x=>!Number.isNaN(x)&&x>0).sort((a,b)=>b-a);
const plateHeight=(p)=>({55:82,45:78,35:72,25:66,20:62,15:58,10:52,5:44,2.5:38,1.25:32}[p]||36);
const round2=(n)=>Math.round(n*100)/100;

function plateStyle(p,u){
  if(u==="kg"){
    return {
      25:["linear-gradient(180deg,#cf2e2e 0%,#991b1b 100%)","#7f1d1d","#fff"],
      20:["linear-gradient(180deg,#2f5fd3 0%,#1e3a8a 100%)","#1e3a8a","#fff"],
      15:["linear-gradient(180deg,#e4c245 0%,#a16207 100%)","#92400e","#111"],
      10:["linear-gradient(180deg,#3f3f46 0%,#18181b 100%)","#18181b","#fff"],
      5:["linear-gradient(180deg,#f7f7f7 0%,#d4d4d8 100%)","#a1a1aa","#111"],
      2.5:["linear-gradient(180deg,#16a34a 0%,#166534 100%)","#166534","#fff"],
      1.25:["linear-gradient(180deg,#f8fafc 0%,#cbd5e1 100%)","#94a3b8","#111"]
    }[p]||["linear-gradient(180deg,#3f3f46 0%,#18181b 100%)","#18181b","#fff"];
  }
  return {
    45:["linear-gradient(180deg,#d97706 0%,#9a3412 100%)","#9a3412","#fff"],
    25:["linear-gradient(180deg,#ef4444 0%,#991b1b 100%)","#991b1b","#fff"],
    15:["linear-gradient(180deg,#2563eb 0%,#1e3a8a 100%)","#1e3a8a","#fff"],
    10:["linear-gradient(180deg,#22c55e 0%,#166534 100%)","#166534","#fff"],
    5:["linear-gradient(180deg,#f4f4f5 0%,#d4d4d8 100%)","#a1a1aa","#111"],
    2.5:["linear-gradient(180deg,#111827 0%,#000000 100%)","#000","#fff"]
  }[p]||["linear-gradient(180deg,#22c55e 0%,#166534 100%)","#166534","#fff"];
}

function groupPlates(arr){
  const c={}; arr.forEach(p=>c[p]=(c[p]||0)+1);
  return Object.entries(c).sort((a,b)=>Number(b[0])-Number(a[0])).map(([plate,count])=>({plate:Number(plate),count}));
}
function listText(arr,u){
  if(!arr.length) return "No plates needed";
  return groupPlates(arr).map(({plate,count})=>`${count} × ${fmt(plate)} ${u}`).join(", ");
}

function closest(target,bar,collar,plates,inventoryMode,inventory){
  const goal=round2((target-bar-collar*2)/2);
  if(goal<0) return null;
  let best={plates:[],weight:0,diff:Math.abs(goal)};
  function dfs(i,w,cur,inv){
    const diff=Math.abs(goal-w);
    if(diff<best.diff||(diff===best.diff&&w>best.weight)) best={plates:[...cur],weight:round2(w),diff:round2(diff)};
    if(i>=plates.length) return;
    const p=plates[i];
    const maxW=Math.floor((goal-w+best.diff)/p);
    const maxI=inventoryMode?Math.floor((inv[p]||0)/2):Math.max(0,Math.floor((goal+best.diff)/p));
    const max=Math.max(0,Math.min(maxW,maxI,12));
    for(let count=max;count>=0;count--){
      const nextInv={...inv};
      if(inventoryMode&&count>0) nextInv[p]=(nextInv[p]||0)-count*2;
      dfs(i+1,round2(w+count*p),[...cur,...Array(count).fill(p)],nextInv);
    }
  }
  dfs(0,0,[],{...inventory});
  return best;
}

function calculate({targetWeight,barWeight,collarWeight,availablePlates,inventoryMode,inventory}){
  if(targetWeight<barWeight+collarWeight*2) return {error:"Target weight must be at least the bar plus collars.",info:"",perSide:[],perSideWeight:0,totalLoaded:round2(barWeight+collarWeight*2),exact:false};
  let remaining=round2((targetWeight-barWeight-collarWeight*2)/2);
  const perSide=[]; const inv={...inventory};
  for(const p of availablePlates){
    let max=Math.floor(remaining/p);
    if(inventoryMode) max=Math.min(max,Math.floor((inv[p]||0)/2));
    for(let i=0;i<max;i++){ perSide.push(p); remaining=round2(remaining-p); if(inventoryMode) inv[p]-=2; }
  }
  const perSideWeight=round2(perSide.reduce((s,p)=>s+p,0));
  const totalLoaded=round2(barWeight+collarWeight*2+perSideWeight*2);
  if(remaining===0) return {error:"",info:collarWeight>0?`Includes ${fmt(collarWeight)} per collar.`:"",perSide,perSideWeight,totalLoaded,exact:true};
  const near=closest(targetWeight,barWeight,collarWeight,availablePlates,inventoryMode,inventory);
  return {
    error:"Cannot make the exact weight with your current setup.",
    info:near?`Closest possible load is ${fmt(round2(barWeight+collarWeight*2+near.weight*2))}.`:"",
    perSide:near?near.plates:perSide,
    perSideWeight:near?near.weight:perSideWeight,
    totalLoaded:near?round2(barWeight+collarWeight*2+near.weight*2):totalLoaded,
    exact:false
  };
}

function BarbellDiagram({perSide,unitLabel,barWeight,collarWeight}){
  const left=[...perSide].reverse();
  const dense=(perSide.length+(collarWeight>0?1:0))>8;
  return (
    <div className="card small-card">
      <h3 className="section-title">Bar view</h3>
      <div className={`barbell-fit ${dense?"dense":""}`}>
        <div className="plate-side">
          {left.map((p,i)=>{const [bg,border,text]=plateStyle(p,unitLabel); return <div key={`l-${p}-${i}`} className="plate realistic" style={{height:`${plateHeight(p)}px`,background:bg,borderColor:border,color:text}}><span className="plate-label">{fmt(p)}</span></div>})}
          {collarWeight>0?<div className="collar">C</div>:null}
        </div>
        <div className="bar-section" />
        <div className="bar-center short-bar"><strong>{fmt(barWeight)} {unitLabel}</strong><span>bar</span></div>
      </div>
    </div>
  );
}

function SetupButton({active,children,onClick}){ return <button type="button" className={active?"pill active":"pill"} onClick={onClick}>{children}</button>; }

export default function App(){
  const [setupMode,setSetupMode]=useState(()=> typeof window==="undefined" ? "acuostandard" : (localStorage.getItem(STORAGE.setup)||"acuostandard"));
  const activeSetup=SETUPS[setupMode]||SETUPS.acuostandard;
  const [unitLabel,setUnitLabel]=useState(activeSetup.unit);
  const [targetWeight,setTargetWeight]=useState(String(activeSetup.target));
  const [barWeight,setBarWeight]=useState(String(activeSetup.bar));
  const [collarWeight,setCollarWeight]=useState(String(activeSetup.collar));
  const [plateInput,setPlateInput]=useState(activeSetup.plates.join(", "));
  const [inventoryMode,setInventoryMode]=useState(()=> typeof window==="undefined" ? false : localStorage.getItem(STORAGE.inventory)==="true");
  const [inventory,setInventory]=useState(activeSetup.inventory);
  const [favorites,setFavorites]=useState(()=> {
    if(typeof window==="undefined") return activeSetup.favorites;
    const saved=localStorage.getItem(STORAGE.favorites);
    return saved?JSON.parse(saved):activeSetup.favorites;
  });
  const [favoriteDraft,setFavoriteDraft]=useState("");

  useEffect(()=>{ localStorage.setItem(STORAGE.favorites,JSON.stringify(favorites)); },[favorites]);
  useEffect(()=>{ localStorage.setItem(STORAGE.setup,setupMode); },[setupMode]);
  useEffect(()=>{ localStorage.setItem(STORAGE.inventory,String(inventoryMode)); },[inventoryMode]);

  useEffect(()=>{
    const next=SETUPS[setupMode]||SETUPS.acuostandard;
    setUnitLabel(next.unit);
    setBarWeight(String(next.bar));
    setCollarWeight(String(next.collar));
    setPlateInput(next.plates.join(", "));
    setInventory(next.inventory);
    setFavorites(next.favorites);
    setTargetWeight(String(next.target));
    setInventoryMode(false);
  },[setupMode]);

  const availablePlates=useMemo(()=>parsePlates(plateInput),[plateInput]);
  const result=useMemo(()=>{
    const target=Number(targetWeight), bar=Number(barWeight), collar=Number(collarWeight);
    if(Number.isNaN(target)||Number.isNaN(bar)||Number.isNaN(collar)||target<=0||bar<=0||collar<0||availablePlates.length===0) return null;
    return calculate({targetWeight:target,barWeight:bar,collarWeight:collar,availablePlates,inventoryMode,inventory});
  },[targetWeight,barWeight,collarWeight,availablePlates,inventoryMode,inventory]);

  function updateInventoryCount(plate,value){ const parsed=Math.max(0,Number(value)||0); setInventory(prev=>({...prev,[plate]:parsed})); }
  function addFavorite(){ const v=Number(favoriteDraft); if(!Number.isNaN(v)&&v>0&&!favorites.includes(v)){ setFavorites(prev=>[...prev,v].sort((a,b)=>a-b)); setFavoriteDraft(""); } }
  function removeFavorite(weight){ setFavorites(prev=>prev.filter(x=>x!==weight)); }

  return (
    <div className="app-shell">
      <div className="phone-frame">
        <div className="app-header">
          <p className="eyebrow">ACUO CrossFit</p>
          <h1>Plate Calculator</h1>
          
        </div>
        <div className="top-controls">
          <div className="setup-row">
            {Object.entries(SETUPS).map(([key,setup])=><SetupButton key={key} active={setupMode===key} onClick={()=>setSetupMode(key)}>{setup.name}</SetupButton>)}
          </div>
        </div>

    <div className="card">
          <h2 className="card-title">Load</h2>
          {unitLabel==="lb" ? <div className="bar-options">
            {activeSetup.barOptions.map(w=><button key={w} type="button" className={Number(barWeight)===w?"pill active":"pill"} onClick={()=>setBarWeight(String(w))}>{w} lb bar</button>)}
          </div> : null}

          <div className="grid one">
            <label className="field">
              <span>Target</span>
              <input inputMode="decimal" type="number" value={targetWeight} onChange={e=>setTargetWeight(e.target.value)} />
            </label>

            <div className="quick-adjust">
              <button type="button" className="secondary big" onClick={()=>setTargetWeight(String(Math.max(Number(barWeight)||0,(Number(targetWeight)||0)-5)))}>-5</button>
              <button type="button" className="secondary big" onClick={()=>setTargetWeight(String((Number(targetWeight)||0)+5))}>+5</button>
            </div>

            <div className="quick-picks">
              {favorites.map(w=><button key={w} type="button" className="pill large" onClick={()=>setTargetWeight(String(w))}>{w}</button>)}
            </div>

            /*<div className="two-up">
              <label className="field">
                <span>Bar</span>
                <input inputMode="decimal" type="number" value={barWeight} onChange={e=>setBarWeight(e.target.value)} />
              </label>
              <label className="field">
                <span>Collar</span>
                <input inputMode="decimal" type="number" value={collarWeight} onChange={e=>setCollarWeight(e.target.value)} />
              </label>
            </div>
          </div>*/
        
        <div className="card result-card sticky-result">
          {!result ? <p className="subtle">Enter valid numbers to calculate plates.</p> : <>
            <div className="hero-result">
              <span>Per side</span>
              <strong>{listText(result.perSide,unitLabel)}</strong>
            </div>
            <div className="stats compact-stats">
              <div className="stat"><span>Total</span><strong>{fmt(result.totalLoaded)} {unitLabel}</strong></div>
              <div className="stat"><span>Side</span><strong>{fmt(result.perSideWeight)} {unitLabel}</strong></div>
            </div>
            <BarbellDiagram perSide={result.perSide} unitLabel={unitLabel} barWeight={Number(barWeight)||0} collarWeight={Number(collarWeight)||0}/>
          </>}
        </div>

        
        </div>

        {result ? <div className={result.exact?"notice success":"notice warning"}>
          <strong>{result.exact?"Exact match":result.error}</strong>
          {result.info ? <p>{result.info}</p> : null}
        </div> : null}

        <details className="advanced">
          <summary>Advanced options</summary>
          <div className="card small-card">
            <label className="field">
              <span>Available Plate Sizes</span>
              <input value={plateInput} onChange={e=>setPlateInput(e.target.value)} />
              <small>Comma separated plate sizes in {unitLabel}.</small>
            </label>

            <div className="toggle-row">
              <div>
                <strong>Gym inventory mode</strong>
                <p className="subtle">Optional. Leave off for normal class use.</p>
              </div>
              <button type="button" className={inventoryMode?"toggle active":"toggle"} onClick={()=>setInventoryMode(v=>!v)} aria-pressed={inventoryMode}><span /></button>
            </div>

            {inventoryMode ? <div className="grid two inventory-grid">
              {availablePlates.map(plate=><label className="field compact" key={plate}>
                <span>{fmt(plate)} {unitLabel}</span>
                <input type="number" min="0" value={inventory[plate]??0} onChange={e=>updateInventoryCount(plate,e.target.value)} />
              </label>)}
            </div> : null}

            <div className="favorites-editor">
              <h3>Quick lifts</h3>
              <div className="favorites">
                {favorites.map(w=><div key={w} className="favorite-chip">
                  <button type="button" onClick={()=>setTargetWeight(String(w))}>{w} {unitLabel}</button>
                  <button type="button" className="remove" onClick={()=>removeFavorite(w)}>×</button>
                </div>)}
              </div>

              <div className="add-favorite">
                <input type="number" value={favoriteDraft} onChange={e=>setFavoriteDraft(e.target.value)} placeholder={`Add quick lift ${unitLabel}`} />
                <button type="button" className="primary" onClick={addFavorite}>Add</button>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
