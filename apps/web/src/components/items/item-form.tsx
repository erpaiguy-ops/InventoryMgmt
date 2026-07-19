'use client';

import type { CategoryAttribute, ItemWithDetails } from '@inventory-mgmt/shared-types';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBrands, useItemCategories } from '@/hooks/use-items';
import { useTaxes, useUoms } from '@/hooks/use-settings';
import type { ItemPayload } from '@/services/items.service';

const NONE = '__none__';

interface ItemFormProps {
  initial?: ItemWithDetails;
  submitting: boolean;
  onSubmit: (payload: ItemPayload) => void;
}

interface UomLine {
  uomId: string;
  factor: string;
}

interface BarcodeLine {
  barcode: string;
  uomId: string;
}

export function ItemForm({ initial, submitting, onSubmit }: ItemFormProps) {
  const { data: uoms } = useUoms();
  const { data: taxes } = useTaxes();
  const { data: categories } = useItemCategories();
  const { data: brands } = useBrands();

  const [sku, setSku] = useState(initial?.sku ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [itemType, setItemType] = useState(initial?.itemType ?? 'stocked');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? NONE);
  const [brandId, setBrandId] = useState(initial?.brandId ?? NONE);
  const [baseUomId, setBaseUomId] = useState(initial?.baseUomId ?? '');
  const [taxId, setTaxId] = useState(initial?.taxId ?? NONE);
  const [tracking, setTracking] = useState(initial?.tracking ?? 'none');
  const [trackExpiry, setTrackExpiry] = useState(initial?.trackExpiry ?? false);
  const [standardCost, setStandardCost] = useState(
    initial?.standardCost != null ? String(initial.standardCost) : '',
  );
  const [standardPrice, setStandardPrice] = useState(
    initial?.standardPrice != null ? String(initial.standardPrice) : '',
  );
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [attributes, setAttributes] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initial?.attributes ?? {}).map(([k, v]) => [k, String(v ?? '')]),
    ),
  );
  const [uomLines, setUomLines] = useState<UomLine[]>(
    (initial?.uoms ?? []).map((u) => ({ uomId: u.uomId, factor: String(u.factorToBase) })),
  );
  const [barcodeLines, setBarcodeLines] = useState<BarcodeLine[]>(
    (initial?.barcodes ?? []).map((b) => ({ barcode: b.barcode, uomId: b.uomId ?? NONE })),
  );

  const categoryAttributes: CategoryAttribute[] = useMemo(() => {
    if (categoryId === NONE) return [];
    return (categories ?? []).find((c) => c.id === categoryId)?.attributeSchema ?? [];
  }, [categories, categoryId]);

  const canSubmit = name.trim() !== '' && baseUomId !== '' && !submitting;

  const handleSubmit = () => {
    const typedAttributes: Record<string, unknown> = {};
    for (const attr of categoryAttributes) {
      const raw = attributes[attr.key];
      if (raw === undefined || raw === '') continue;
      typedAttributes[attr.key] =
        attr.type === 'number' ? Number(raw) : attr.type === 'boolean' ? raw === 'true' : raw;
    }

    onSubmit({
      sku: sku.trim() || undefined,
      name: name.trim(),
      description: description.trim() || undefined,
      itemType,
      categoryId: categoryId === NONE ? undefined : categoryId,
      brandId: brandId === NONE ? undefined : brandId,
      baseUomId,
      taxId: taxId === NONE ? undefined : taxId,
      tracking,
      trackExpiry: tracking === 'batch' ? trackExpiry : false,
      attributes: typedAttributes,
      standardCost: standardCost === '' ? undefined : Number(standardCost),
      standardPrice: standardPrice === '' ? undefined : Number(standardPrice),
      status,
      uoms: uomLines
        .filter((line) => line.uomId && Number(line.factor) > 0)
        .map((line) => ({ uomId: line.uomId, factorToBase: Number(line.factor) })),
      barcodes: barcodeLines
        .filter((line) => line.barcode.trim() !== '')
        .map((line) => ({
          barcode: line.barcode.trim(),
          uomId: line.uomId === NONE ? undefined : line.uomId,
        })),
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="item-sku">SKU</Label>
              <Input
                id="item-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={itemType} onValueChange={(v) => setItemType(v as typeof itemType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stocked">Stocked</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Base unit</Label>
              <Select value={baseUomId} onValueChange={setBaseUomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {(uoms ?? []).map((uom) => (
                    <SelectItem key={uom.id} value={uom.id}>
                      {uom.code} — {uom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {(categories ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Brand</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {(brands ?? []).map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {categoryAttributes.length > 0 && (
            <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Category attributes</p>
              {categoryAttributes.map((attr) => (
                <div key={attr.key} className="space-y-1">
                  <Label htmlFor={`attr-${attr.key}`}>{attr.label}</Label>
                  {attr.type === 'boolean' ? (
                    <Select
                      value={attributes[attr.key] ?? ''}
                      onValueChange={(v) => setAttributes((a) => ({ ...a, [attr.key]: v }))}
                    >
                      <SelectTrigger id={`attr-${attr.key}`}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`attr-${attr.key}`}
                      type={
                        attr.type === 'number' ? 'number' : attr.type === 'date' ? 'date' : 'text'
                      }
                      value={attributes[attr.key] ?? ''}
                      onChange={(e) => setAttributes((a) => ({ ...a, [attr.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing &amp; tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="item-cost">Standard cost</Label>
                <Input
                  id="item-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={standardCost}
                  onChange={(e) => setStandardCost(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="item-price">Standard price</Label>
                <Input
                  id="item-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={standardPrice}
                  onChange={(e) => setStandardPrice(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Tax</Label>
              <Select value={taxId} onValueChange={setTaxId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {(taxes ?? []).map((tax) => (
                    <SelectItem key={tax.id} value={tax.id}>
                      {tax.name} ({tax.rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tracking policy</Label>
                <Select value={tracking} onValueChange={(v) => setTracking(v as typeof tracking)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="batch">Batch / lot</SelectItem>
                    <SelectItem value="serial">Serial numbers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tracking === 'batch' && (
                <div className="space-y-1">
                  <Label>Track expiry</Label>
                  <Select
                    value={trackExpiry ? 'yes' : 'no'}
                    onValueChange={(v) => setTrackExpiry(v === 'yes')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Units &amp; barcodes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Alternate units (factor to base)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUomLines((lines) => [...lines, { uomId: '', factor: '' }])}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {uomLines.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    value={line.uomId}
                    onValueChange={(v) =>
                      setUomLines((lines) =>
                        lines.map((l, i) => (i === index ? { ...l, uomId: v } : l)),
                      )
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {(uoms ?? [])
                        .filter((uom) => uom.id !== baseUomId)
                        .map((uom) => (
                          <SelectItem key={uom.id} value={uom.id}>
                            {uom.code}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-28"
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Factor"
                    value={line.factor}
                    onChange={(e) =>
                      setUomLines((lines) =>
                        lines.map((l, i) => (i === index ? { ...l, factor: e.target.value } : l)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setUomLines((lines) => lines.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Barcodes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBarcodeLines((lines) => [...lines, { barcode: '', uomId: NONE }])
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {barcodeLines.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Barcode"
                    value={line.barcode}
                    onChange={(e) =>
                      setBarcodeLines((lines) =>
                        lines.map((l, i) => (i === index ? { ...l, barcode: e.target.value } : l)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setBarcodeLines((lines) => lines.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create item'}
        </Button>
      </div>
    </div>
  );
}
