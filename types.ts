
export type Step = 'welcome' | 'input' | 'processing' | 'drawing' | 'animating_draw' | 'draw_result' | 'bwei' | 'result' | 'history';
export type InputMode = 'voice' | 'manual';
export type BweiResult = 'sheng' | 'xiao' | 'yin' | 'standing' | null;

export interface Poem {
  id: number;
  title: string;
  grade: string;
  poem: string;
  explanation: string;
  advice: string;
}

export interface UserInfo {
  name: string;
  quest: string;
  birthday: string;
  address: string;
}

export interface DivinationRecord extends Poem, UserInfo {
  timestamp: string;
  key: number;
}
