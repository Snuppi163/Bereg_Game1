import React from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, Rect, Stop, Svg } from 'react-native-svg';
import type { ObjectArt } from '../core/hiddenObject/HiddenObjectEngine';
import type { Cell } from '../core/match3/Match3Engine';

export const tileNames = ['Ключи','Фонари','Капли','Листья','Радиодетали','Кристаллы'];
export const tileColors = ['#f0cf86','#ff9b48','#6cd9f3','#9ed671','#ff817a','#d49bf5'];

export function ObjectGlyph({ id }: { id: ObjectArt }) {
  const key = <><Circle cx="15" cy="16" r="9" fill="none" stroke="#dfb978" strokeWidth="5"/><Path d="M22 22L41 41l6-6m-13-1 5-5" stroke="#dfb978" strokeWidth="5" fill="none" strokeLinecap="round"/></>;
  const clock = <><Circle cx="25" cy="25" r="19" fill="#554437" stroke="#ae8e62" strokeWidth="4"/><Circle cx="25" cy="25" r="14" fill="#d7c39a"/><Path d="M25 14v11l7 3M25 11v3m0 22v3M11 25h3m22 0h3" stroke="#574633" strokeWidth="2.3" strokeLinecap="round"/></>;
  const photo = <><Rect x="6" y="7" width="38" height="35" rx="2" fill="#ded0aa"/><Rect x="10" y="11" width="30" height="24" fill="#77705e"/><Path d="M10 31l11-11 6 6 4-5 9 11v3H10" fill="#494e43"/><Circle cx="29" cy="18" r="3" fill="#bfb58e"/></>;
  const letter = <><Rect x="4" y="11" width="42" height="27" rx="2" fill="#cab38b" stroke="#7f674c" strokeWidth="1.5"/><Path d="M5 13l20 14 20-14M5 37l14-14m26 14L31 23" stroke="#927655" fill="none"/><Circle cx="25" cy="27" r="3.8" fill="#8b4439"/></>;
  const radio = <><Path d="M3 32h11m22-14h11" stroke="#a1a399" strokeWidth="3" strokeLinecap="round"/><Rect x="12" y="14" width="26" height="22" rx="6" fill="#a54736" stroke="#e5a489" strokeWidth="2"/><Path d="M20 16v18m7-18v18m5-18v18" stroke="#e69a68" strokeWidth="2.5"/></>;
  const art: Record<ObjectArt, React.ReactNode> = {
    key, clock, photo, letter, radio,
    spoon: <><Ellipse cx="25" cy="13" rx="9" ry="12" fill="#b9b1a0" stroke="#d3c8b6" strokeWidth="2"/><Path d="M25 21v25" stroke="#bdad95" strokeWidth="5" strokeLinecap="round"/><Path d="M21 8q4-5 8 0" stroke="#eee1cc" fill="none"/></>,
    lamp: <><Path d="M17 35l-2-18 5-5V5h10v7l5 5-2 18z" fill="#d3a459" stroke="#876638" strokeWidth="2"/><Path d="M25 19q12 15 0 16-12-1 0-16" fill="#ffcb74"/><Path d="M12 20q-10 10 4 17m22-17q10 10-4 17" fill="none" stroke="#b38550" strokeWidth="2"/><Rect x="11" y="36" width="28" height="9" rx="3" fill="#755639" stroke="#bf985d" strokeWidth="2"/></>,
    coin: <><Circle cx="25" cy="25" r="16" fill="#a48353" stroke="#d6b67b" strokeWidth="2"/><Circle cx="25" cy="25" r="12" stroke="#745d3f" fill="none" strokeDasharray="2 2"/><Path d="M20 19l5-3v16m-6 0h12" stroke="#d0ab6b" strokeWidth="2.5" fill="none"/></>,
    matches: <><Rect x="9" y="11" width="29" height="27" rx="2" fill="#d1b381" stroke="#765844" strokeWidth="2"/><Rect x="11" y="15" width="23" height="15" fill="#94614c"/><Path d="M20 27l6-9 3 6z" fill="#edd099"/><Path d="M39 16l5 18" stroke="#d2b47c" strokeWidth="3"/><Circle cx="39" cy="16" r="2.5" fill="#984742"/></>,
    flashlight: <><Path d="M6 17h10l8 6h20v13H24l-8 5H6z" fill="#707c63" stroke="#b2a989" strokeWidth="2"/><Path d="M8 18v22m18-14v7m6-7v7m6-7v7" stroke="#c5ba89" strokeWidth="2"/><Path d="M5 20v18" stroke="#e4d4a5" strokeWidth="3"/></>,
    cassette: <><Rect x="4" y="10" width="42" height="29" rx="3" fill="#4c5047" stroke="#b7a98a" strokeWidth="2"/><Rect x="9" y="15" width="32" height="12" rx="2" fill="#af9579"/><Circle cx="16" cy="21" r="4" fill="#3d4138"/><Circle cx="34" cy="21" r="4" fill="#3d4138"/><Path d="M12 37l5-7h16l5 7" fill="#877b63"/></>,
    compass: <><Circle cx="25" cy="26" r="17" fill="#7e8064" stroke="#bf9f69" strokeWidth="3"/><Circle cx="25" cy="26" r="12" fill="#cac6a2"/><Path d="M31 17l-4 12-8 7 4-12z" fill="#a45b4a"/><Path d="M25 4v6" stroke="#ad8d5c" strokeWidth="4"/></>,
    glasses: <><Path d="M3 20h8m28 0h8M20 24q5-6 10 0" fill="none" stroke="#9a6546" strokeWidth="3"/><Ellipse cx="13" cy="25" rx="9" ry="7" fill="#b6c9be" fillOpacity=".36" stroke="#ad7858" strokeWidth="3"/><Ellipse cx="37" cy="25" rx="9" ry="7" fill="#b6c9be" fillOpacity=".36" stroke="#ad7858" strokeWidth="3"/></>,
    lock: <><Path d="M16 23v-9a9 9 0 0 1 18 0v9" stroke="#c1af88" strokeWidth="4" fill="none"/><Rect x="10" y="21" width="30" height="22" rx="3" fill="#826746" stroke="#baa16e" strokeWidth="2"/><Path d="M25 28v8" stroke="#433f36" strokeWidth="5" strokeLinecap="round"/></>,
    pendant: <><Path d="M3 5q8 17 21 18T47 4" stroke="#b29568" strokeWidth="2" fill="none"/><Ellipse cx="25" cy="33" rx="10" ry="13" fill="#a87052" stroke="#cba77b" strokeWidth="2"/><Ellipse cx="25" cy="33" rx="5" ry="8" fill="#c39a6d"/></>,
    notebook: <><Rect x="9" y="6" width="31" height="38" rx="3" fill="#587368" stroke="#baa786" strokeWidth="2"/><Path d="M16 7v36m6-29h12m-12 5h10" stroke="#b7a382" strokeWidth="2"/><Path d="M11 40h28" stroke="#e2cdb0" strokeWidth="3"/></>,
    hook: <><Path d="M28 5v27c0 15-17 15-17 5v-7l-5 5m22-30q-5-7-9 0 1 5 9 0" fill="none" stroke="#c2c4b0" strokeWidth="3" strokeLinecap="round"/></>,
    map: <><Path d="M4 14l14-5 14 5 14-5v29l-14 5-14-5-14 5z" fill="#c7bb8c" stroke="#8c7958" strokeWidth="2"/><Path d="M18 11v25m14-19v24M7 30q11-10 22-5l12-8" stroke="#758e83" strokeWidth="2" fill="none"/><Path d="M22 16l5 6m0-6l-5 6" stroke="#904c3e" strokeWidth="2"/></>,
    watch: <><Path d="M25 9q-3-9 3-7t6 7q10 6 13 0" fill="none" stroke="#bc995d" strokeWidth="2"/><G transform="translate(4 7) scale(.83)">{clock}</G></>,
    rope: <><Ellipse cx="25" cy="28" rx="18" ry="10" fill="none" stroke="#b19668" strokeWidth="4"/><Ellipse cx="24" cy="24" rx="20" ry="10" fill="none" stroke="#c6ab79" strokeWidth="3"/><Ellipse cx="25" cy="26" rx="14" ry="7" fill="none" stroke="#98774f" strokeWidth="3"/><Path d="M25 31q13 2 13 12" fill="none" stroke="#c6ab79" strokeWidth="3"/></>,
    battery: <><Rect x="14" y="11" width="20" height="34" rx="3" fill="#756f61" stroke="#bab09b" strokeWidth="2"/><Rect x="20" y="6" width="8" height="5" fill="#c3bfaa"/><Path d="M15 27h18v14H15" fill="#a37850"/><Path d="M20 20h8m-4-4v8" stroke="#d2c3a8" strokeWidth="2"/></>,
    note: <><Path d="M8 8h34v29l-8 7H8z" fill="#d3bd93" stroke="#8d7354" strokeWidth="2"/><Path d="M13 16h21m-21 6h25m-25 6h20m-20 6h13" stroke="#806b54" strokeWidth="1.5"/><Path d="M34 44v-8h8" fill="#e6cda0"/></>
  };
  return <G>{art[id]}</G>;
}

export function TileArt({ cell, size }: { cell: Cell; size: number }) {
  const tile = cell.tile;
  const color = tile && 'color' in tile ? tile.color : -1;
  const tint = tileColors[color] ?? '#d8b27b';
  const special = tile && 'special' in tile ? tile.special : undefined;
  const shapes = [
    <Path key="key" d="M20 9a9 9 0 0 0-9 9c0 6 6 10 11 8l13 14 6-6-4-4-3 3-5-6 3-3-5-5c1-7-2-10-7-10zm0 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" fillRule="evenodd"/>,
    <Path key="lamp" d="M16 11h18v5h-3l5 19h3v6H11v-6h3l5-19h-3z"/>,
    <Path key="water" d="M25 6c5 10 14 19 14 26a14 14 0 1 1-28 0c0-7 9-16 14-26z"/>,
    <Path key="leaf" d="M43 9C18 7 7 18 10 32c-2 4-5 6-5 6l4 4 7-8c18 8 27-9 27-25z"/>,
    <Path key="radio" d="M19 7h12v6c8 1 12 7 12 13s-4 11-12 12v5H19v-5C11 37 7 32 7 26s4-12 12-13z"/>,
    <Polygon key="crystal" points="24,5 37,13 44,28 31,43 16,39 6,24 13,12"/>,
  ];
  return <Svg width={size} height={size} viewBox="0 0 50 50">
    <Defs><LinearGradient id="tile" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#fff7cd"/><Stop offset=".38" stopColor={tint}/><Stop offset="1" stopColor={tint} stopOpacity=".68"/></LinearGradient></Defs>
    {!!tile && cell.block !== 'crate' && <>
      <Ellipse cx="25" cy="39" rx="15" ry="5" fill="#080f0e" opacity=".46"/>
      {color >= 0 ? <G fill="url(#tile)" stroke={tint} strokeWidth="1.4">{shapes[color]}</G> : <G transform="translate(2 2) scale(.92)"><ObjectGlyph id="letter"/></G>}
      {color === 1 && <Path d="M25 19q12 15 0 17-12-2 0-17" fill="#fff2ae" opacity=".85"/>}
      {color === 2 && <Path d="M17 29q-2 6 4 9" fill="none" stroke="#d8ffff" strokeWidth="2" strokeLinecap="round"/>}
      {color === 3 && <Path d="M14 34l22-18m-13 11l-1-9m7 5h7" fill="none" stroke="#4d7c40" strokeWidth="1.5"/>}
      {color === 4 && <Path d="M15 20h20m-20 6h20m-20 6h20" fill="none" stroke="#763a42" strokeWidth="2"/>}
      {color === 5 && <Path d="M24 6l-7 18 14 19 4-26-18 7H7m28-7 8 11-26-4" fill="none" stroke="#fff0ff" opacity=".65"/>}
      {!!special && <G><Circle cx="37" cy="13" r="10" fill="#212f30" stroke="#f8daa5" strokeWidth="1.6"/>{special === 'color' ? <G><Circle cx="34" cy="12" r="3" fill="#ff8d72"/><Circle cx="40" cy="12" r="3" fill="#87d8ff"/><Circle cx="37" cy="17" r="3" fill="#c2ec8c"/></G> : special === 'area' ? <Path d="M37 6l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffcb77"/> : <Path d={special === 'row' ? 'M31 13h12m-3-3 3 3-3 3' : 'M37 7v12m-3-3 3 3 3-3'} fill="none" stroke="#ffe39f" strokeWidth="2"/>}</G>}
    </>}
    {cell.block === 'crate' && <G><Rect x="4" y="4" width="42" height="42" rx="5" fill="#76543d" stroke="#bd8c57" strokeWidth="2.4"/><Path d="M6 18h38m-38 13h38M7 42L42 7" stroke="#aa7950" strokeWidth="5"/><Path d="M8 8h34v34H8z" fill="none" stroke="#563d2f" strokeWidth="2"/></G>}
    {cell.block === 'web' && <Path d="M2 2l46 46M48 2L2 48M25 1v48M1 25h48M13 13h24v24H13zM25 7l18 18-18 18L7 25z" stroke="#e4d9bd" opacity=".75" fill="none" strokeWidth="1.2"/>}
    {cell.block === 'glass' && <G><Rect x="3" y="3" width="44" height="44" rx="6" fill="#b4e7ef" fillOpacity={cell.layers === 2 ? '.35' : '.16'} stroke="#9bced3" strokeWidth="2"/><Path d="M7 23L25 6M21 43l23-23m-9 23 8-8" stroke="#cef7f6" opacity=".7" strokeWidth="2"/></G>}
    {cell.block === 'lock' && <G><Path d="M5 8l40 34M6 42L44 8" stroke="#c5b29c" strokeWidth="4"/><G transform="translate(20 18) scale(.25)"><ObjectGlyph id="lock"/></G></G>}
  </Svg>;
}
