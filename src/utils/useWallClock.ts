import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useWallClock(interval=1000) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    const refresh=()=>setNow(Date.now());
    const tick=setInterval(refresh,interval);
    const sub=AppState.addEventListener('change',state=>{if(state==='active')refresh();});
    return ()=>{clearInterval(tick);sub.remove();};
  },[interval]);
  return now;
}
