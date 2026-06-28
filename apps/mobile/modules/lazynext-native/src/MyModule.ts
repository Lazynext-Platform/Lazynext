import { NativeModule, requireNativeModule } from 'expo';

declare class MyModule extends NativeModule<{}> {
  getProjectInfo(): Promise<string>;
  processIntent(prompt: string, isChat: boolean): Promise<string>;
  addClip(trackIndex: number, clipType: string, name: string, start: number, end: number): Promise<string>;
  moveClip(clipId: string, newStart: number): Promise<string>;
}

export default requireNativeModule<MyModule>('MyModule');
