import StorageManager from "./StorageManager";

export { default as Storage } from './Storage';
export { default as StorageManager } from './StorageManager';
export const manager = new StorageManager();
export * from './types';
