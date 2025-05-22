declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    getAllKeys(): Promise<string[]>;
    multiGet(keys: string[]): Promise<[string, string | null][]>;
    multiSet(keyValuePairs: [string, string][]): Promise<void>;
    multiRemove(keys: string[]): Promise<void>;
  };
  
  export default AsyncStorage;
}

declare module 'expo-sharing' {
  export function shareAsync(url: string, options?: {
    mimeType?: string;
    dialogTitle?: string;
    UTI?: string;
  }): Promise<void>;
  
  export function isAvailableAsync(): Promise<boolean>;
}

declare module 'expo-font' {
  export interface FontSource {
    [name: string]: any;
  }
  
  export function loadAsync(
    fontFamilyOrFontMap: { [fontFamily: string]: any },
    source?: any
  ): Promise<void>;
  
  export function useFonts(
    fonts: { [fontFamily: string]: any }
  ): [boolean, Error | null];
} 