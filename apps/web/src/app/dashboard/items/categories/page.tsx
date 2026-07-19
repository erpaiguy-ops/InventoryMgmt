'use client';

import {
  ACTIONS,
  hasPermission,
  MODULES,
  type CategoryAttribute,
  type ItemCategory,
} from '@inventory-mgmt/shared-types';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCreateCategory, useDeleteCategory, useItemCategories } from '@/hooks/use-items';
import { usePrincipal } from '@/hooks/use-principal';

const ROOT = '__root__';

interface AttributeLine {
  key: string;
  label: string;
  type: CategoryAttribute['type'];
}

export default function CategoriesPage() {
  const { data: categories, isLoading } = useItemCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const { principal } = usePrincipal();
  const permissions = principal?.type === 'tenant' ? principal.permissions : undefined;
  const canCreate = hasPermission(permissions, MODULES.ITEMS, ACTIONS.CREATE);
  const canDelete = hasPermission(permissions, MODULES.ITEMS, ACTIONS.DELETE);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState(ROOT);
  const [attributeLines, setAttributeLines] = useState<AttributeLine[]>([]);

  if (isLoading) return <LoadingSpinner />;

  const parentName = (category: ItemCategory) =>
    (categories ?? []).find((c) => c.id === category.parentId)?.name ?? '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Item categories</h1>
        {canCreate && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New category</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="cat-name">Name</Label>
                  <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Parent</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROOT}>None (top level)</SelectItem>
                      {(categories ?? []).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom attributes for items in this category</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAttributeLines((lines) => [
                          ...lines,
                          { key: '', label: '', type: 'text' },
                        ])
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {attributeLines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        className="w-32"
                        placeholder="key_name"
                        value={line.key}
                        onChange={(e) =>
                          setAttributeLines((lines) =>
                            lines.map((l, i) =>
                              i === index
                                ? { ...l, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }
                                : l,
                            ),
                          )
                        }
                      />
                      <Input
                        className="flex-1"
                        placeholder="Label"
                        value={line.label}
                        onChange={(e) =>
                          setAttributeLines((lines) =>
                            lines.map((l, i) =>
                              i === index ? { ...l, label: e.target.value } : l,
                            ),
                          )
                        }
                      />
                      <Select
                        value={line.type}
                        onValueChange={(v) =>
                          setAttributeLines((lines) =>
                            lines.map((l, i) =>
                              i === index ? { ...l, type: v as AttributeLine['type'] } : l,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setAttributeLines((lines) => lines.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!name || createCategory.isPending}
                  onClick={() =>
                    createCategory.mutate(
                      {
                        name,
                        parentId: parentId === ROOT ? undefined : parentId,
                        attributeSchema: attributeLines.filter((l) => l.key && l.label),
                      },
                      {
                        onSuccess: () => {
                          toast.success('Category created');
                          setOpen(false);
                          setName('');
                          setParentId(ROOT);
                          setAttributeLines([]);
                        },
                        onError: (e) =>
                          toast.error(e instanceof Error ? e.message : 'Failed to create'),
                      },
                    )
                  }
                >
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Attributes</TableHead>
              {canDelete && <TableHead className="w-16" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(categories ?? []).map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{parentName(category)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {category.attributeSchema.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      category.attributeSchema.map((attr) => (
                        <Badge key={attr.key} variant="outline">
                          {attr.label}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                {canDelete && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        deleteCategory.mutate(category.id, {
                          onSuccess: () => toast.success('Category deleted'),
                          onError: (e) =>
                            toast.error(e instanceof Error ? e.message : 'Failed to delete'),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {(categories ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-center">
                  No categories yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
