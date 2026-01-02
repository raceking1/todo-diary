
import type { DailyData, AppState } from '../types';

const STORAGE_KEY = 'linen_diary_data';
const PWD_KEY = 'linen_diary_pwd';

export const getInitialDailyData = (): DailyData => ({
  todo: [],
  diary: '',
  mood: '',
  photos: [],
});

export const loadAllData = (): AppState => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      const parsedData = JSON.parse(data);
      // Basic data migration for old structure
      Object.keys(parsedData).forEach(date => {
        if (parsedData[date] && (parsedData[date] as any).photo && !parsedData[date].photos) {
          parsedData[date].photos = [(parsedData[date] as any).photo];
          delete (parsedData[date] as any).photo;
        }
        if (!parsedData[date].todo) parsedData[date].todo = [];
        if (!parsedData[date].diary) parsedData[date].diary = '';
        if (!parsedData[date].mood) parsedData[date].mood = '';
        if (!parsedData[date].photos) parsedData[date].photos = [];
      });
      return parsedData;
    } catch (error) {
      console.error("Failed to parse data from localStorage", error);
      return {};
    }
  }
  return {};
};


export const loadDataByDate = (date: string): DailyData => {
  const allData = loadAllData();
  return allData[date] || getInitialDailyData();
};

export const saveDataByDate = (date: string, dailyData: DailyData) => {
  const allData = loadAllData();
  allData[date] = dailyData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
};

export const saveAllData = (data: AppState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getStoredPassword = (): string => {
  return localStorage.getItem(PWD_KEY) || '0000';
};

export const saveNewPassword = (newPwd: string) => {
  localStorage.setItem(PWD_KEY, newPwd);
};
