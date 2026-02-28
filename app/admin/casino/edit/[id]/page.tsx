'use client';

import { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiImage, FiX, FiLoader } from 'react-icons/fi';

interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string | null;
  thumbnail: string | null;
  stock: number | null;
  time_hours: number | null;
  income_amount: number | null;
  role_required_id: string | null;
  role_given_id: string | null;
  role_removed_id: string | null;
  required_balance: number | null;
  reply_message: string | null;
  expires_in_days: number | null;
  expires_at: string | null;
}

export default function EditShopItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [item, setItem] = useState<ShopItem | null>(null);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    thumbnail: '',
    stock: '',
    time_hours: '',
    income_amount: '',
    role_required_id: '',
    role_given_id: '',
    role_removed_id: '',
    required_balance: '',
    reply_message: '',
    expires_in_days: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && id) {
      fetchItem();
    }
  }, [status, id]);

  const fetchItem = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/casino/shop/${id}`);

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Item not found');
        }
        throw new Error('Failed to fetch item');
      }

      const data = await res.json();
      setItem(data.item);
      setCurrencyEmoji(data.currencyEmoji || '🪙');

      // Populate form
      setFormData({
        name: data.item.name || '',
        price: data.item.price?.toString() || '0',
        description: data.item.description || '',
        thumbnail: data.item.thumbnail || '',
        stock: data.item.stock !== null ? data.item.stock.toString() : '',
        time_hours: data.item.time_hours?.toString() || '',
        income_amount: data.item.income_amount?.toString() || '',
        role_required_id: data.item.role_required_id || '',
        role_given_id: data.item.role_given_id || '',
        role_removed_id: data.item.role_removed_id || '',
        required_balance: data.item.required_balance?.toString() || '',
        reply_message: data.item.reply_message || '',
        expires_in_days: data.item.expires_in_days?.toString() || ''
      });

    } catch (err: any) {
      console.error('Error fetching item:', err);
      setError(err.message || 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/casino/shop/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          price: formData.price,
          description: formData.description || null,
          thumbnail: formData.thumbnail || null,
          stock: formData.stock !== '' ? formData.stock : null,
          time_hours: formData.time_hours || null,
          income_amount: formData.income_amount || null,
          role_required_id: formData.role_required_id || null,
          role_given_id: formData.role_given_id || null,
          role_removed_id: formData.role_removed_id || null,
          required_balance: formData.required_balance || null,
          reply_message: formData.reply_message || null,
          expires_in_days: formData.expires_in_days || null
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update item');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      console.error('Error updating item:', err);
      setError(err.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))] animate-pulse">Loading item...</p>
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-2xl text-center">
            <p className="text-red-500 text-lg mb-4">{error}</p>
            <Link
              href="/admin/casino"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[rgb(var(--color-bg-tertiary))] rounded-xl hover:bg-[rgb(var(--color-hover))] transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/casino"
            className="p-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[rgb(var(--color-text-primary))]">Edit Shop Item</h1>
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
              Modify the item properties and save changes
            </p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between">
            <span className="text-red-500">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-500">
            ✓ Item updated successfully!
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-blue p-6 rounded-2xl border border-[rgb(var(--color-border))]">
                <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">Basic Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                      placeholder="e.g., Big Stack"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Price ({currencyEmoji}) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      min="0"
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                      placeholder="730000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none resize-none"
                      placeholder="Bigger payouts. Faster cycle."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Thumbnail URL
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="url"
                        name="thumbnail"
                        value={formData.thumbnail}
                        onChange={handleChange}
                        className="flex-1 px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                        placeholder="https://example.com/image.png"
                      />
                      {formData.thumbnail && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[rgb(var(--color-bg-tertiary))]">
                          <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-blue p-6 rounded-2xl border border-[rgb(var(--color-border))]">
                <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">Income Settings</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Income Amount ({currencyEmoji})
                    </label>
                    <input
                      type="number"
                      name="income_amount"
                      value={formData.income_amount}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                      placeholder="10000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Every X Hours
                    </label>
                    <input
                      type="number"
                      name="time_hours"
                      value={formData.time_hours}
                      onChange={handleChange}
                      min="1"
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                      placeholder="21"
                    />
                  </div>
                </div>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2">
                  Leave both empty if this item doesn&apos;t generate income
                </p>
              </div>

              <div className="glass-blue p-6 rounded-2xl border border-[rgb(var(--color-border))]">
                <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">Role Configuration</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Role Required (ID)
                    </label>
                    <input
                      type="text"
                      name="role_required_id"
                      value={formData.role_required_id}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                      placeholder="123456789012345678"
                    />
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">Users must have this role to purchase</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Role Given on Redeem (ID)
                    </label>
                    <input
                      type="text"
                      name="role_given_id"
                      value={formData.role_given_id}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                      placeholder="123456789012345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Role Removed on Redeem (ID)
                    </label>
                    <input
                      type="text"
                      name="role_removed_id"
                      value={formData.role_removed_id}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                      placeholder="123456789012345678"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Additional Settings */}
            <div className="space-y-6">
              <div className="glass-blue p-6 rounded-2xl border border-[rgb(var(--color-border))]">
                <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">Availability</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Stock
                    </label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                      placeholder="Leave empty for unlimited"
                    />
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">Leave empty for unlimited stock</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                      Expires in (Days)
                    </label>
                    <input
                      type="number"
                      name="expires_in_days"
                      value={formData.expires_in_days}
                      onChange={handleChange}
                      min="1"
                      className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                      placeholder="7"
                    />
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">Days until item is no longer available</p>
                  </div>
                </div>
              </div>

              <div className="glass-blue p-6 rounded-2xl border border-[rgb(var(--color-border))]">
                <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">Requirements</h2>

                <div>
                  <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                    Minimum Balance ({currencyEmoji})
                  </label>
                  <input
                    type="number"
                    name="required_balance"
                    value={formData.required_balance}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none"
                    placeholder="500000"
                  />
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">User must have at least this balance</p>
                </div>
              </div>

              <div className="glass-blue p-6 rounded-2xl border border-[rgb(var(--color-border))]">
                <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">Reply Message</h2>

                <div>
                  <textarea
                    name="reply_message"
                    value={formData.reply_message}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-yellow-500/50 focus:outline-none resize-none"
                    placeholder="Thank you for purchasing! Your code is..."
                  />
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-1">Sent to user after purchase</p>
                </div>
              </div>

              {/* Preview Card */}
              {item && (
                <div className="glass-blue p-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5">
                  <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">Preview</h2>
                  <div className="flex items-center gap-3">
                    {formData.thumbnail ? (
                      <img src={formData.thumbnail} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                        <FiImage className="w-6 h-6 text-yellow-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-[rgb(var(--color-text-primary))]">{formData.name || 'Item Name'}</p>
                      <p className="text-sm text-yellow-500">{currencyEmoji} {parseInt(formData.price || '0').toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-[rgb(var(--color-border))]">
            <Link
              href="/admin/casino"
              className="px-6 py-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
