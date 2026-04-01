
import React, {useState} from "react";

const plates = [45,25,10,5,2.5];

export default function App(){
  const [target,setTarget]=useState(185);

  function calc(){
    let remaining=(target-45)/2;
    let result=[];
    plates.forEach(p=>{
      while(remaining>=p){
        result.push(p);
        remaining-=p;
      }
    });
    return result;
  }

  const perSide = calc();

  return (
    <div className="app">
      <h1>ACUO Plate Calculator</h1>

      <input type="number" value={target} onChange={e=>setTarget(Number(e.target.value))} />

      <div className="result">
        <h2>Per Side</h2>
        <div>{perSide.join(", ")}</div>

        <div className="bar">
          {perSide.map((p,i)=>
            <div key={i} className="plate" style={{height:40+p}}>
              <span>{p}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
