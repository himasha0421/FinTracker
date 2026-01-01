import { useEffect, useMemo, useState } from 'react';
import { expenseCategoryOptions, normalizeCategoryValue } from '@/features/transactions/constants';

export type CategoryBudget = {
  category: string;
  monthlyTarget: number;
};

const STORAGE_KEY = 'category-budgets-2026-v1';

const FALLBACK_CATEGORIES = expenseCategoryOptions.map(option => option.value);
const ALLOWED_CATEGORY_SET = new Set(
  expenseCategoryOptions.map(option => option.value.toLowerCase())
);

const toCategoryList = (categories: string[]) =>
  categories.map(category => category.trim()).filter(category => category.length > 0);

const loadStoredBudgets = (): CategoryBudget[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CategoryBudget[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(entry => typeof entry.category === 'string')
      .map(entry => ({
        category: normalizeCategoryValue(entry.category),
        monthlyTarget: Number(entry.monthlyTarget) || 0,
      }))
      .filter(entry => ALLOWED_CATEGORY_SET.has(entry.category.toLowerCase()));
  } catch {
    return [];
  }
};

export function useCategoryBudgets(categories: string[]) {
  const normalizedCategories = useMemo(() => {
    const cleaned = toCategoryList(categories)
      .map(category => normalizeCategoryValue(category))
      .filter(category => ALLOWED_CATEGORY_SET.has(category.toLowerCase()));
    return cleaned.length > 0 ? cleaned : FALLBACK_CATEGORIES;
  }, [categories]);

  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => loadStoredBudgets());

  useEffect(() => {
    setBudgets(current => {
      const validCurrent = current.filter(entry =>
        ALLOWED_CATEGORY_SET.has(entry.category.toLowerCase())
      );
      const existing = new Map(validCurrent.map(entry => [entry.category, entry]));
      const merged = normalizedCategories.map(category =>
        existing.get(category) || { category, monthlyTarget: 0 }
      );
      validCurrent.forEach(entry => {
        if (!merged.find(item => item.category === entry.category)) {
          merged.push(entry);
        }
      });
      return merged;
    });
  }, [normalizedCategories]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  }, [budgets]);

  const updateBudget = (category: string, monthlyTarget: number) => {
    setBudgets(current =>
      current.map(entry =>
        entry.category === category
          ? { ...entry, monthlyTarget: Number.isFinite(monthlyTarget) ? monthlyTarget : 0 }
          : entry
      )
    );
  };

  const addCategory = (categoryName: string, yearlyTarget = 0) => {
    const trimmed = normalizeCategoryValue(categoryName);
    if (!trimmed) return;
    if (!ALLOWED_CATEGORY_SET.has(trimmed.toLowerCase())) return;
    const targetValue = Number.isFinite(yearlyTarget) ? yearlyTarget : 0;
    setBudgets(current => {
      if (current.some(entry => entry.category.toLowerCase() === trimmed.toLowerCase())) {
        return current;
      }
      return [...current, { category: trimmed, monthlyTarget: targetValue }];
    });
  };

  const mergedCategories = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    normalizedCategories.forEach(category => {
      const key = category.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      list.push(category);
    });
    budgets.forEach(entry => {
      const key = entry.category.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      list.push(entry.category);
    });
    return list;
  }, [normalizedCategories, budgets]);

  const budgetMap = useMemo(() => {
    const map: Record<string, number> = {};
    budgets.forEach(entry => {
      map[entry.category] = entry.monthlyTarget;
    });
    return map;
  }, [budgets]);

  return { budgets, updateBudget, addCategory, budgetMap, categories: mergedCategories };
}
