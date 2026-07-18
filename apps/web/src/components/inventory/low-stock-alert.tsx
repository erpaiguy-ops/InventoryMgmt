'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLowStockInventory } from '@/hooks/use-inventory';

export function LowStockAlert() {
  const { data: lowStock = [] } = useLowStockInventory();

  if (lowStock.length === 0) return null;

  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{lowStock.length} item(s) at or below reorder level</AlertTitle>
      <AlertDescription>
        <Link href="/dashboard/inventory" className="hover:underline">
          Review low stock inventory
        </Link>
      </AlertDescription>
    </Alert>
  );
}
