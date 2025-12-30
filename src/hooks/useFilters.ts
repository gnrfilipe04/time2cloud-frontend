import { useState, useEffect } from 'react';

export const useFilters = <T extends Record<string, string>>(
  pageKey: string,
  initialFilters: T
): [T, (filters: T | ((prev: T) => T)) => void] => {
  const storageKey = `filters_${pageKey}`;

  const [filters, setFilters] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Mescla com valores iniciais para garantir que novos campos sejam incluídos
        return { ...initialFilters, ...parsed };
      }
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    }
    return initialFilters;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch (error) {
      console.error('Erro ao salvar filtros:', error);
    }
  }, [filters, storageKey]);

  const updateFilters = (newFilters: T | ((prev: T) => T)) => {
    setFilters((prev) => {
      const updated = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
      return updated;
    });
  };

  return [filters, updateFilters];
};

