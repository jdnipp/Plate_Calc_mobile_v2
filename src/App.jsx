import React,{useState} from "react";

const PLATES=[45,25,15,10,5,2.5];

function calc(t){
 let r=(t-45)/2,res=[];
 PLATES.forEach(p=>{while(r>=p){res.push(p);r-=p}});
 return res;
}

export default function App(){
 const [t,setT]=useState(185);
 const ps=calc(t);

 return (
  <div className="app">
   <h1>ACUO Plate Calculator</h1>
   <input type="number" value={t} onChange={e=>setT(Number(e.target.value))}/>
   <div className="card">
    <h2>Per Side</h2>
    <div className="list">{ps.join(", ")}</div>
    <div className="bar">
     {ps.map((p,i)=>(<div key={i} className="plate" style={{height:40+p}}><span>{p}</span></div>))}
    </div>
   </div>
  </div>
 );
}
