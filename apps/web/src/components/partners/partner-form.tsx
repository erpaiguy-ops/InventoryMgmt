'use client';

import type { PartnerWithDetails } from '@inventory-mgmt/shared-types';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

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
import { usePriceLists } from '@/hooks/use-items';
import { usePartnerGroups, usePaymentTerms } from '@/hooks/use-partners';
import type { PartnerPayload } from '@/services/partners.service';

const NONE = '__none__';

interface PartnerFormProps {
  initial?: PartnerWithDetails;
  submitting: boolean;
  onSubmit: (payload: PartnerPayload) => void;
}

interface ContactLine {
  name: string;
  designation: string;
  email: string;
  phone: string;
}

interface AddressLine {
  addressType: 'billing' | 'shipping';
  line1: string;
  city: string;
  country: string;
}

export function PartnerForm({ initial, submitting, onSubmit }: PartnerFormProps) {
  const { data: paymentTerms } = usePaymentTerms();
  const { data: groups } = usePartnerGroups();
  const { data: priceLists } = usePriceLists();

  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [isCustomer, setIsCustomer] = useState(initial?.isCustomer ?? true);
  const [isSupplier, setIsSupplier] = useState(initial?.isSupplier ?? false);
  const [taxIdNumber, setTaxIdNumber] = useState(initial?.taxIdNumber ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [paymentTermId, setPaymentTermId] = useState(initial?.paymentTermId ?? NONE);
  const [creditLimit, setCreditLimit] = useState(
    initial?.creditLimit != null ? String(initial.creditLimit) : '',
  );
  const [priceListId, setPriceListId] = useState(initial?.priceListId ?? NONE);
  const [groupId, setGroupId] = useState(initial?.groupId ?? NONE);
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [contacts, setContacts] = useState<ContactLine[]>(
    (initial?.contacts ?? []).map((contact) => ({
      name: contact.name,
      designation: contact.designation ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
    })),
  );
  const [addresses, setAddresses] = useState<AddressLine[]>(
    (initial?.addresses ?? []).map((address) => ({
      addressType: address.addressType,
      line1: address.line1,
      city: address.city ?? '',
      country: address.country ?? '',
    })),
  );

  const roleValue = isCustomer && isSupplier ? 'both' : isSupplier ? 'supplier' : 'customer';
  const canSubmit = name.trim() !== '' && !submitting;

  const handleSubmit = () => {
    onSubmit({
      code: code.trim() || undefined,
      name: name.trim(),
      isCustomer,
      isSupplier,
      taxIdNumber: taxIdNumber.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      paymentTermId: paymentTermId === NONE ? undefined : paymentTermId,
      creditLimit: creditLimit === '' ? undefined : Number(creditLimit),
      priceListId: priceListId === NONE ? undefined : priceListId,
      groupId: groupId === NONE ? undefined : groupId,
      status,
      notes: notes.trim() || undefined,
      contacts: contacts
        .filter((contact) => contact.name.trim() !== '')
        .map((contact, index) => ({
          name: contact.name.trim(),
          designation: contact.designation.trim() || undefined,
          email: contact.email.trim() || undefined,
          phone: contact.phone.trim() || undefined,
          isPrimary: index === 0,
        })),
      addresses: addresses
        .filter((address) => address.line1.trim() !== '')
        .map((address) => ({
          addressType: address.addressType,
          line1: address.line1.trim(),
          city: address.city.trim() || undefined,
          country: address.country.trim() || undefined,
        })),
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="p-code">Code</Label>
              <Input
                id="p-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={roleValue}
                onValueChange={(v) => {
                  setIsCustomer(v === 'customer' || v === 'both');
                  setIsSupplier(v === 'supplier' || v === 'both');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="both">Customer &amp; supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="p-email">Email</Label>
              <Input
                id="p-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-phone">Phone</Label>
              <Input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="p-taxid">Tax ID</Label>
              <Input
                id="p-taxid"
                value={taxIdNumber}
                onChange={(e) => setTaxIdNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="p-notes">Notes</Label>
            <Textarea id="p-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commercial terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Payment term</Label>
                <Select value={paymentTermId} onValueChange={setPaymentTermId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {(paymentTerms ?? []).map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-credit">Credit limit</Label>
                <Input
                  id="p-credit"
                  type="number"
                  min={0}
                  step="0.01"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Price list</Label>
                <Select value={priceListId} onValueChange={setPriceListId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Default</SelectItem>
                    {(priceLists ?? []).map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.listType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Group</Label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {(groups ?? []).map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.map((contact, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Name"
                  value={contact.name}
                  onChange={(e) =>
                    setContacts((cs) =>
                      cs.map((c, i) => (i === index ? { ...c, name: e.target.value } : c)),
                    )
                  }
                />
                <Input
                  className="w-40"
                  placeholder="Phone"
                  value={contact.phone}
                  onChange={(e) =>
                    setContacts((cs) =>
                      cs.map((c, i) => (i === index ? { ...c, phone: e.target.value } : c)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setContacts((cs) => cs.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setContacts((cs) => [...cs, { name: '', designation: '', email: '', phone: '' }])
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add contact
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {addresses.map((address, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={address.addressType}
                  onValueChange={(v) =>
                    setAddresses((as) =>
                      as.map((a, i) =>
                        i === index ? { ...a, addressType: v as 'billing' | 'shipping' } : a,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  placeholder="Address"
                  value={address.line1}
                  onChange={(e) =>
                    setAddresses((as) =>
                      as.map((a, i) => (i === index ? { ...a, line1: e.target.value } : a)),
                    )
                  }
                />
                <Input
                  className="w-32"
                  placeholder="City"
                  value={address.city}
                  onChange={(e) =>
                    setAddresses((as) =>
                      as.map((a, i) => (i === index ? { ...a, city: e.target.value } : a)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setAddresses((as) => as.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAddresses((as) => [
                  ...as,
                  { addressType: 'billing', line1: '', city: '', country: '' },
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" /> Add address
            </Button>
          </CardContent>
        </Card>

        <Button className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create partner'}
        </Button>
      </div>
    </div>
  );
}
