import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/utils/format';

export interface OrderItemRow {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderItemsTableProps {
  items: OrderItemRow[];
  productLabel: (productId: string) => string;
}

export function OrderItemsTable({ items, productLabel }: OrderItemsTableProps) {
  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Unit price</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={`${item.productId}-${index}`}>
            <TableCell>{productLabel(item.productId)}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
            <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right">{formatCurrency(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
