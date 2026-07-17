'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ProductSearch } from '@/components/products/product-search';
import { ProductTable } from '@/components/products/product-table';
import { Button } from '@/components/ui/button';
import { useProductCategories, useProducts } from '@/hooks/use-products';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useProducts({ search, category, page, pageSize: PAGE_SIZE });
  const { data: categories = [] } = useProductCategories();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button asChild>
          <Link href="/dashboard/products/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      <ProductSearch
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        category={category}
        onCategoryChange={(value) => {
          setCategory(value);
          setPage(1);
        }}
        categories={categories}
      />

      <ProductTable
        products={data?.data ?? []}
        loading={isLoading}
        pagination={
          data
            ? {
                page: data.meta.page,
                pageSize: data.meta.pageSize,
                totalItems: data.meta.totalItems,
                totalPages: data.meta.totalPages,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
