import type { Product } from '@/types';

export function kcalForServing(product: Product, grams: number): number {
  return (product.kcalPer100g * grams) / 100;
}

export function fatForServing(product: Product, grams: number): number {
  return (product.fatPer100g * grams) / 100;
}
