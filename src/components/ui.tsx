import React from 'react';
import { Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import Svg,{Defs,LinearGradient,Rect,Stop} from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { useGameOptional } from './GameContext';

export const palette = {
  bg:'#293d31', panel:'#3e5540', raised:'#4c6751', stroke:'#819064', cream:'#fff1d6',
  muted:'#bdc9b7', gold:'#edc483', goldDark:'#352c21', green:'#c1e3ca', rust:'#f1aaa0'
};
const serif = 'serif';

export function Screen({children, scroll = false}: {children:React.ReactNode; scroll?:boolean}) {
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="light-content"/>
    <Animated.View entering={FadeIn.duration(180)} style={{flex:1}}>
      {scroll ? <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">{children}</ScrollView> :
        <View style={[styles.page,{flex:1}]}>{children}</View>}
    </Animated.View>
  </SafeAreaView>;
}
export function Title({children, small = false}: {children:React.ReactNode;small?:boolean}) {
  return <Text accessibilityRole="header" style={[styles.title, small && styles.titleSmall]}>{children}</Text>;
}
export function Label({children, tone = 'muted'}:{children:React.ReactNode;tone?:'muted'|'gold'|'green'|'rust'}) {
  return <Text style={[styles.label,{color:palette[tone]}]}>{children}</Text>;
}
export function Copy({children}: {children:React.ReactNode}) { return <Text style={styles.copy}>{children}</Text>; }
export function Button({ title, onPress, secondary = false, disabled = false, compact = false }: {
  title:string; onPress:()=>void; secondary?:boolean; disabled?:boolean; compact?:boolean;
}) {
  const game=useGameOptional();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={()=>{game?.effect('button');onPress();}} disabled={disabled}
    style={({pressed}) => [styles.button, secondary && styles.buttonSecondary, compact && styles.compact, disabled && {opacity:.5}, pressed && {opacity:.76}]}>
    <Svg width="100%" height="100%" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Defs><LinearGradient id="buttonFinish" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop stopColor={secondary?'#708d65':'#ffe7a9'}/><Stop offset="100%" stopColor={secondary?'#3f5b47':'#d0934d'}/>
      </LinearGradient></Defs><Rect x="0" y="0" width="100%" height="100%" fill="url(#buttonFinish)"/>
    </Svg>
    <Text style={[styles.buttonText, secondary && {color:palette.cream}, compact && {fontSize:14}]}>{title}</Text>
  </Pressable>;
}
export function Panel({children, animated = false}: {children:React.ReactNode; animated?:boolean}) {
  return animated ? <Animated.View entering={FadeInDown.duration(240)} style={styles.panel}>{children}</Animated.View> :
    <View style={styles.panel}>{children}</View>;
}
export function Row({children}: {children:React.ReactNode}) { return <View style={styles.row}>{children}</View>; }
export function Heading({eyebrow,title,onBack,back = 'Назад'}: {eyebrow?:string;title:string;onBack?:()=>void;back?:string}) {
  return <Row><View style={{flex:1,gap:3}}>{eyebrow && <Label tone="gold">{eyebrow}</Label>}<Title small>{title}</Title></View>
    {onBack && <Button title={back} onPress={onBack} compact secondary/>}
  </Row>;
}
export function Instruction({visible,title,text,button,onClose}: {
  visible:boolean; title:string; text:string; button:string; onClose:()=>void;
}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><View style={styles.modalContent}>
      <Panel><Title small>{title}</Title><Copy>{text}</Copy><Button title={button} onPress={onClose}/></Panel>
    </View></View>
  </Modal>;
}
export const styles = StyleSheet.create({
  modalBackdrop:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#10201cbb',padding:22},
  modalContent:{width:'100%',maxWidth:440},
  safe:{flex:1,backgroundColor:palette.bg},
  page:{paddingHorizontal:16,paddingVertical:12,gap:12},
  title:{fontFamily:serif,fontWeight:'700',fontSize:38,lineHeight:44,color:palette.cream},
  titleSmall:{fontSize:27,lineHeight:32},
  label:{fontSize:13,lineHeight:18,fontWeight:'600',color:palette.muted},
  copy:{fontSize:16,lineHeight:24,color:palette.cream},
  button:{minHeight:52,justifyContent:'center',alignItems:'center',paddingVertical:10,paddingHorizontal:17,borderRadius:21,overflow:'hidden',
    backgroundColor:palette.gold,borderWidth:1,borderColor:'#ad835b',borderBottomWidth:3},
  buttonSecondary:{backgroundColor:palette.raised,borderColor:palette.stroke},
  compact:{minHeight:44,paddingHorizontal:12,paddingVertical:8},
  buttonText:{fontSize:16,color:palette.goldDark,fontWeight:'700',textAlign:'center'},
  panel:{borderWidth:1,borderColor:palette.stroke,backgroundColor:palette.panel,borderRadius:17,padding:14,gap:8},
  row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
});
