'use client';

import { SearchBar } from '@/components/common/search-bar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
}

const ALL_CATEGORIES = '__all__';

export function ProductSearch({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
}: ProductSearchProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SearchBar value={search} onChange={onSearchChange} placeholder="Search by name or SKU..." />
      <Select
        value={category || ALL_CATEGORIES}
        onValueChange={(value) => onCategoryChange(value === ALL_CATEGORIES ? '' : value)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
