export function boardLayout(width:number,height:number,columns:number,rows:number,fontScale=1) {
  const contentWidth = Math.max(0,width-32);
  const horizontal = Math.floor((contentWidth-10)/columns);
  const toolWidth = Math.min(88,Math.floor((contentWidth-24)/4));
  const safeHeight = height-48;
  const chrome = 290 + Math.ceil(Math.max(0,fontScale-1)*85);
  const room = Math.floor((safeHeight-chrome)/rows);
  const size = Math.max(20,Math.min(57,horizontal,Math.max(28,room)));
  return {size,toolWidth,scroll: size*rows+chrome>safeHeight};
}
