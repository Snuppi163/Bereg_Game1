import React,{useId} from 'react';
import { Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated,{FadeIn,FadeInDown,FadeOut,useAnimatedStyle,useSharedValue,withSpring,withTiming} from 'react-native-reanimated';
import Svg,{Defs,LinearGradient,Path,Rect,Stop} from 'react-native-svg';
import { useGameOptional } from './GameContext';

export const palette={
  bg:'#131f2c',panel:'#1d2e3d',raised:'#294055',stroke:'#586775',cream:'#fff1d5',muted:'#b5c4cc',
  gold:'#edc37c',goldDark:'#3a2417',green:'#b4d5b5',rust:'#efa9a2',ink:'#172735',blue:'#8fb9cb',
};

export type Glyph='play'|'village'|'farm'|'tasks'|'shop'|'heart'|'star'|'life'|'back'|'close'|'settings'|'book'|
  'gift'|'box'|'market'|'build'|'water'|'plus'|'minus'|'next'|'eye'|'pause'|'rewind'|'wave'|'hammer'|'swap'|'shuffle'|
  'clock'|'sound'|'music'|'motion'|'quality'|'check'|'trash'|'lock'|'hand';
const paths:Record<Glyph,string>={
  play:'M8 4.5v15l12-7.5Z',village:'M2 11.5 12 3l10 8.5M5 10v10h14V10M9 20v-6h6v6',
  farm:'M12 22V8M12 13C5 13 3 10 3 6c5 0 9 2 9 7Zm0 4c7 0 9-3 9-7-5 0-9 2-9 7ZM12 8c-3-3-2-5 0-7 2 2 3 4 0 7Z',
  tasks:'M7 5H4v16h16V5h-3M8 3h8v5H8M8 12h8M8 16h8',shop:'M3 9h18l-2 12H5Zm3 0L10 3m8 6-4-6M9 13v4m6-4v4',
  heart:'M12 21 3.8 13C-1 8 6 1 12 7c6-6 13 1 8.2 6Z',star:'m12 2 3 6.5 7 .8-5 5 1.2 7L12 18l-6.2 3.3 1.2-7-5-5 7-.8Z',
  life:'M12 2c3 4 7 8 7 13a7 7 0 0 1-14 0c0-4 3-8 7-13Zm-2 13 2 2 3-4',back:'M20 12H5m0 0 6-6m-6 6 6 6',
  close:'m6 6 12 12M6 18 18 6', settings:'M9 3h6l1 3 3 1 2 4-2 2v3l-3 3-3-1-3 1-3-3v-3l-2-2 2-4 3-1Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  book:'M12 6q-4-4-10-2v14q6-2 10 2 4-4 10-2V4q-6-2-10 2Zm0 0v14',gift:'M3 9h18v4H3zm2 4v8h14v-8M12 9v12m0-12C3 8 8 0 12 9c4-9 9-1 0 0',
  box:'m3 7 9-4 9 4v10l-9 4-9-4Zm0 0 9 4 9-4m-9 4v10M8 5l9 4',market:'M3 10l2-6h14l2 6M3 10q2 4 4 0 3 4 5 0 3 4 5 0 2 4 4 0M5 13v7h14v-7M10 20v-6h4v6',
  build:'m3 13 9-9 9 9M6 11v9h12v-9m-6 9v-5m-2 2h4',water:'M12 2c4 6 7 10 7 14a7 7 0 0 1-14 0c0-4 3-8 7-14Zm-3 14c0 2 1 3 3 3',
  plus:'M12 5v14M5 12h14',minus:'M5 12h14',next:'m9 6 6 6-6 6',eye:'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  pause:'M8 5v14m8-14v14',rewind:'M8 6l-5 5 5 5m-5-5h10a5 5 0 0 1 0 10',wave:'M2 8q2-3 5 0t5 0 5 0 5 0M2 15q2-3 5 0t5 0 5 0 5 0',
  hammer:'m4 20 11-11m-3-3 3-3 5 5-3 3-3-1-1-3Z',swap:'M3 8h17l-4-4m4 4-4 4M21 16H4l4-4m-4 4 4 4',
  shuffle:'M3 6h5l8 12h5m-3-3 3 3-3 3M3 18h5l2-3m4-6 2-3h5m-3-3 3 3-3 3',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
  sound:'M3 9h4l5-4v14l-5-4H3Zm13-1q5 4 0 8m2-11q8 7 0 14',music:'M10 18V5l10-2v13M10 18a3 2 0 1 0-6 0 3 2 0 1 0 6 0Zm10-2a3 2 0 1 0-6 0 3 2 0 1 0 6 0Z',
  motion:'M3 6h9m-7 6h8m-4 6h4m3-15 5 9-5 9',quality:'m4 8 4-4h8l4 4-8 13Zm0 0h16M8 4l4 17 4-17',
  check:'m5 12 4 4L19 6',trash:'M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M11 10v6m3-6v6',
  lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Zm7 4v3',hand:'M8 11V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v8-3a1.5 1.5 0 0 1 3 0v5q0 6-6 6h-3q-3 0-6-5l-2-3q1-2 4 1Z',
};
export function Icon({name,size=21,color=palette.gold,filled=false}:{name:Glyph;size?:number;color?:string;filled?:boolean}){
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d={paths[name]} fill={filled?color:'none'} stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>;
}

type ButtonProps={
  title:string;onPress:()=>void;disabled?:boolean;variant?:'primary'|'quiet'|'danger'|'round'|'label';
  icon?:Glyph;art?:ImageSourcePropType;compact?:boolean;style?:StyleProp<ViewStyle>;badge?:string|number;
};
export function GameButton({title,onPress,disabled=false,variant='quiet',icon,art,compact=false,style,badge}:ButtonProps){
  const game=useGameOptional();
  const pressed=useSharedValue(0);
  const motion=!game?.progress.settings.reducedMotion;
  const scale=useAnimatedStyle(()=>({transform:[{scale:1-.056*pressed.value}]}));
  const glint=useAnimatedStyle(()=>({opacity:.15*pressed.value}));
  const round=variant==='round', primary=variant==='primary', label=variant==='label';
  return <Animated.View style={[styles.buttonWrap,style,scale,disabled&&styles.disabled]}>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled}} disabled={disabled}
      onPressIn={()=>{if(motion)pressed.value=withTiming(1,{duration:90});}}
      onPressOut={()=>{pressed.value=motion?withSpring(0,{damping:17,stiffness:320}):0;}}
      onPress={()=>{game?.effect('button');onPress();}}
      style={[styles.button,primary&&styles.primary,round&&styles.round,label&&styles.textButton,compact&&styles.compact,variant==='danger'&&styles.danger]}>
      {primary&&<View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Image source={require('../assets/interface/brass.webp')} resizeMode="stretch" style={styles.fullImage}/>
      </View>}
      {!!art&&<Image source={art} resizeMode="contain" style={{width:round?24:25,height:round?24:25}}/>}
      {icon&&<Icon name={icon} size={round?19:17} color={primary?palette.goldDark:variant==='danger'?palette.rust:palette.gold} filled={icon==='play'}/>}
      {!round&&<Text numberOfLines={2} style={[styles.buttonText,primary&&styles.primaryText,label&&styles.textLabel,variant==='danger'&&{color:palette.rust}]}>{title}</Text>}
      {badge!==undefined&&<View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,styles.glint,round&&{borderRadius:24},glint]}/>
    </Pressable>
  </Animated.View>;
}
export function Screen({children,scroll=false,style}:{children:React.ReactNode;scroll?:boolean;style?:StyleProp<ViewStyle>}){
  const reduced=useGameOptional()?.progress.settings.reducedMotion;
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content"/>
    <Animated.View entering={reduced?undefined:FadeIn.duration(170)} style={{flex:1}}>
      {scroll?<ScrollView contentContainerStyle={[styles.page,style]} keyboardShouldPersistTaps="handled">{children}</ScrollView>:
        <View style={[styles.page,{flex:1},style]}>{children}</View>}
    </Animated.View>
  </SafeAreaView>;
}
export function Scene({source,children,veil=true,shade='full'}:{
  source:ImageSourcePropType;children:React.ReactNode;veil?:boolean;shade?:'full'|'edges';
}){
  return <View style={styles.safe}>
    <StatusBar barStyle="light-content"/>
    <Backdrop source={source}/>
    {veil&&<SceneVeil shade={shade}/>}
    <SafeAreaView style={styles.sceneContent}>{children}</SafeAreaView>
  </View>;
}
export function Backdrop({source,opacity=1}:{source:ImageSourcePropType;opacity?:number}){
  return <View pointerEvents="none" style={styles.artFrame}>
    <Image source={source} resizeMode="cover" style={[styles.fullImage,{opacity}]}/>
  </View>;
}
export function SceneVeil({shade='full'}:{shade?:'full'|'edges'}){
  const id=useId().replace(/[^A-Za-z0-9]/g,'');
  return <Svg width="100%" height="100%" pointerEvents="none" style={StyleSheet.absoluteFillObject}>
    <Defs><LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
      <Stop stopColor="#0c1828" stopOpacity=".8"/><Stop offset=".23" stopColor="#0c1828" stopOpacity=".1"/>
      <Stop offset={shade==='edges'?'.73':'.53'} stopColor="#0c1828" stopOpacity="0"/>
      <Stop offset="1" stopColor="#0b1522" stopOpacity={shade==='edges'?'.64':'.98'}/>
    </LinearGradient></Defs><Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`}/>
  </Svg>;
}

export function Title({children,small=false}:{children:React.ReactNode;small?:boolean}){
  return <Text accessibilityRole="header" style={[styles.title,small&&styles.titleSmall]}>{children}</Text>;
}
export function Label({children,tone='muted'}:{children:React.ReactNode;tone?:'muted'|'gold'|'green'|'rust'}){
  return <Text style={[styles.label,{color:palette[tone]}]}>{children}</Text>;
}
export function Copy({children}:{children:React.ReactNode}){return <Text style={styles.copy}>{children}</Text>;}
export function Row({children,style}:{children:React.ReactNode;style?:StyleProp<ViewStyle>}){
  return <View style={[styles.row,style]}>{children}</View>;
}
export function Heading({eyebrow,title,onBack,back='Назад',end}:{
  eyebrow?:string;title:string;onBack?:()=>void;back?:string;end?:React.ReactNode;
}){
  return <View style={styles.titleBar}>
    {onBack&&<GameButton title={back} icon={back==='Пауза'?'pause':'back'} variant="round" onPress={onBack}/>}
    <View style={{flex:1,minWidth:0}}>{eyebrow&&<Text numberOfLines={1} style={styles.eyebrow}>{eyebrow}</Text>}
      <Text numberOfLines={2} accessibilityRole="header" style={styles.headingText}>{title}</Text>
    </View>{end}
  </View>;
}

export function GameWindow({visible,title,onClose,children,center=false,dismissible=true}:{
  visible:boolean;title:string;onClose:()=>void;children:React.ReactNode;center?:boolean;dismissible?:boolean;
}){
  const reduced=useGameOptional()?.progress.settings.reducedMotion;
  return <Modal visible={visible} transparent animationType={reduced?'none':'fade'} onRequestClose={dismissible?onClose:()=>undefined}>
    <SafeAreaView style={[styles.modalBackground,center&&{justifyContent:'center'}]} edges={['top','bottom']}>
      {dismissible&&<Pressable accessible={false} onPress={onClose} style={[StyleSheet.absoluteFillObject,{zIndex:0}]}/>}
      {visible&&<Animated.View entering={reduced?undefined:FadeInDown.duration(210)} style={styles.window} accessibilityViewIsModal>
        <View style={styles.windowTitleBar}>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.windowTitle}>{title}</Text>
          {dismissible&&<GameButton icon="close" title="Закрыть" onPress={onClose} variant="round"/>}
        </View>
        <ScrollView style={styles.windowScroll} contentContainerStyle={styles.windowBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </Animated.View>}
    </SafeAreaView>
  </Modal>;
}
export function Confirm({visible,title,text,action,onClose,onConfirm,danger=false}:{
  visible:boolean;title:string;text:string;action:string;onClose:()=>void;onConfirm:()=>void;danger?:boolean;
}){
  return <GameWindow {...{visible,title,onClose}} center>
    <Copy>{text}</Copy><Row style={{marginTop:8}}>
      <GameButton title="Отмена" onPress={onClose} compact/><GameButton title={action} onPress={onConfirm} variant={danger?'danger':'primary'} compact/>
    </Row>
  </GameWindow>;
}
export function Instruction({visible,title,text,button,onClose}:{visible:boolean;title:string;text:string;button:string;onClose:()=>void}){
  return <GameWindow {...{visible,title,onClose}} center><Copy>{text}</Copy>
    <GameButton title={button} onPress={onClose} variant="primary" compact style={{alignSelf:'center',minWidth:155}}/>
  </GameWindow>;
}
export function SegmentControl<T extends string>({options,value,onChange}:{
  options:readonly {id:T;label:string}[];value:T;onChange:(id:T)=>void;
}){
  return <View style={styles.segment}>{options.map(option=><Pressable key={option.id} accessibilityRole="tab"
    accessibilityState={{selected:value===option.id}} onPress={()=>onChange(option.id)}
    style={[styles.segmentItem,option.id===value&&styles.segmentActive]}>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.72} style={[styles.segmentText,option.id===value&&{color:palette.gold}]}>{option.label}</Text>
    {option.id===value&&<View style={styles.segmentMark}/>}
  </Pressable>)}</View>;
}
export function ProgressLine({now,max}:{now:number;max:number}){
  return <View accessibilityRole="progressbar" accessibilityValue={{min:0,max,now}} style={styles.progressLine}>
    <View style={[styles.progressValue,{width:`${Math.min(100,Math.max(0,now/Math.max(1,max)*100))}%`}]}/>
  </View>;
}
export function Toast({message,delta=0}:{message:string;delta?:number}){
  const reduced=useGameOptional()?.progress.settings.reducedMotion;
  if(!message)return null;
  return <Animated.View accessibilityLiveRegion="polite" entering={reduced?undefined:FadeInDown.duration(210)}
    exiting={reduced?undefined:FadeOut.duration(130)} style={styles.toast}>
    {!!delta&&<Icon name="heart" size={15} color="#f5a3a8" filled/>}
    <Text numberOfLines={3} style={styles.toastText}>{message}</Text>
  </Animated.View>;
}

const styles=StyleSheet.create({
  safe:{flex:1,backgroundColor:palette.bg},sceneContent:{flex:1},page:{gap:12,paddingHorizontal:14,paddingTop:8,paddingBottom:12},
  fullImage:{width:'100%',height:'100%'},artFrame:{...StyleSheet.absoluteFillObject,overflow:'hidden'},
  title:{fontFamily:'serif',fontSize:29,lineHeight:35,color:palette.cream,fontWeight:'700'},
  titleSmall:{fontSize:22,lineHeight:27},label:{fontSize:12,lineHeight:17,fontWeight:'600'},copy:{fontSize:15,lineHeight:21,color:palette.cream},
  headingText:{fontFamily:'serif',fontSize:23,lineHeight:27,color:palette.cream,fontWeight:'700'},
  eyebrow:{fontSize:10,lineHeight:15,color:palette.gold,letterSpacing:1.05,fontWeight:'800'},
  titleBar:{flexDirection:'row',alignItems:'center',gap:10,minHeight:45},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  buttonWrap:{alignSelf:'flex-start'},button:{overflow:'hidden',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,minHeight:48,minWidth:46,
    paddingHorizontal:12,paddingVertical:7,borderRadius:15,borderWidth:1,borderBottomWidth:2,borderColor:'#aa9267',backgroundColor:'#293e52'},
  primary:{minHeight:58,paddingHorizontal:23,borderWidth:0,borderBottomWidth:0,borderRadius:8,backgroundColor:'transparent'},
  round:{overflow:'visible',width:46,height:46,minWidth:46,minHeight:46,paddingVertical:0,paddingHorizontal:0,borderRadius:24,
    backgroundColor:'#24374aec',borderColor:'#b29970'},
  compact:{minHeight:44},textButton:{backgroundColor:'transparent',borderColor:'transparent',borderBottomWidth:1,paddingHorizontal:6},
  danger:{backgroundColor:'#4c2732',borderColor:'#a76d6e'},
  buttonText:{maxWidth:'100%',fontSize:13,lineHeight:17,color:palette.cream,textAlign:'center',fontWeight:'700'},
  primaryText:{fontFamily:'serif',fontSize:19,lineHeight:22,fontWeight:'800',color:palette.goldDark},textLabel:{color:palette.gold},
  glint:{backgroundColor:'#fff0cb'},disabled:{opacity:.43},
  badge:{position:'absolute',right:0,top:0,paddingHorizontal:4,minWidth:15,height:15,borderRadius:8,
    alignItems:'center',justifyContent:'center',backgroundColor:'#a74658'},badgeText:{fontSize:9,color:palette.cream,fontWeight:'800'},
  modalBackground:{flex:1,justifyContent:'flex-end',padding:10,backgroundColor:'#090e17c7'},
  window:{zIndex:1,alignSelf:'center',maxWidth:540,width:'100%',maxHeight:'94%',borderWidth:2,borderColor:'#b99365',
    backgroundColor:'#1d2e3d',borderRadius:22,overflow:'hidden',elevation:14},
  windowTitleBar:{paddingHorizontal:13,paddingTop:8,paddingBottom:7,flexDirection:'row',gap:9,alignItems:'center',borderBottomWidth:1,borderColor:'#6f6b64'},
  windowTitle:{flex:1,fontFamily:'serif',fontSize:22,color:palette.cream,fontWeight:'700'},
  windowScroll:{flexGrow:0},windowBody:{padding:13,gap:12},
  segment:{flexDirection:'row',alignItems:'stretch',borderBottomColor:'#938065',borderBottomWidth:1},
  segmentItem:{flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:1,minHeight:44,minWidth:0},
  segmentActive:{backgroundColor:'#304459'},
  segmentText:{color:palette.muted,fontWeight:'800',fontSize:12},segmentMark:{height:2,width:'65%',backgroundColor:palette.gold,position:'absolute',bottom:0},
  progressLine:{height:5,borderRadius:3,backgroundColor:'#435264',overflow:'hidden'},progressValue:{height:5,borderRadius:3,backgroundColor:'#d9b477'},
  toast:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderRadius:13,borderColor:'#977c58',borderWidth:1,
    paddingHorizontal:9,paddingVertical:6,backgroundColor:'#23394af8'},
  toastText:{color:palette.cream,fontSize:12,lineHeight:16,fontWeight:'700',textAlign:'center',flexShrink:1},
});
