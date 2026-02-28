'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiPackage, FiImage, FiAlertCircle, FiCheck } from 'react-icons/fi';

interface FormData {
  name: string;
  price: string;
  description: string;
  thumbnail: string;
  stock: string;
  income_amount: string;
  time_hours: string;
  role_required_id: string;
  role_given_id: string;
  role_removed_id: string;
  required_balance: string;
  reply_message: string;
  expires_in_days: string;
}

export default function EditItemPage() {
  const params = useParams();
  const itemId = params.id as string;
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    price: '',
    description: '',
    thumbnail: '',
    stock: '',
    income_amount: '',
    time_hours: '',
    role_required_id: '',
    role_given_id: '',
    role_removed_id: '',
    required_balance: '',
    reply_message: '',
    expires_in_days: '',
  });

  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && itemId) {
      fetchItem();
    }
  }, [status, itemId]);

  const fetchItem = async () => {
    try {
      const res = await fetch(`/api/casino/shop/${itemId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch item');
      }

      const item = data.item;
      setFormData({
        name: item.name || '',
        price: item.price?.toString() || '',
        description: item.description || '',
        thumbnail: item.thumbnail || '',
        stock: item.stock?.toString() || '',
        income_amount: item.income_amount?.toString() || '',
        time_hours: item.time_hours?.toString() || '',
        role_required_id: item.role_required_id || '',
        role_given_id: item.role_given_id || '',
        role_removed_id: item.role_removed_id || '',
        required_balance: item.required_balance?.toString() || '',
        reply_message: item.reply_message || '',
        expires_in_days: item.expires_in_days?.toString() || '',
      });
      setCurrencyEmoji(data.currencyEmoji || '🪙');
    } catch (err: any) {
      setError(err.message || 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/casino/shop/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update item');
      }

      setSuccess(true);
      setTimeout(() => router.push('/admin/casino'), 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="h-10 w-48 bg-[rgb(var(--color-bg-tertiary))] rounded-xl animate-pulse mb-8"></div>
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))]">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-[rgb(var(--color-bg-tertiary))] rounded-xl animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-[rgb(var(--color-bg-primary))] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <Link
            href="/admin/casino"
            className="p-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
              Edit Item
            </h1>
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
              {formData.name || 'Loading...'}
            </p>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3">
            <FiCheck className="w-5 h-5 text-green-500" />
            <span className="text-green-500 font-medium">Item updated successfully! Redirecting...</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-500">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
              <FiPackage className="w-5 h-5 text-[rgb(var(--color-accent))]" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="Enter item name"
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
                  min="1"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Stock (empty = unlimited)
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="Unlimited"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition resize-none"
                  placeholder="Describe the item..."
                />
              </div>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
              <FiImage className="w-5 h-5 text-[rgb(var(--color-accent))]" />
              Thumbnail
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 w-full">
                <input
                  type="url"
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="https://example.com/image.png"
                />
              </div>
              {formData.thumbnail && (
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-[rgb(var(--color-bg-tertiary))] flex-shrink-0">
                  <img
                    src={formData.thumbnail}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Income Settings */}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              💰 Income Settings
            </h2>
            <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-4">
              Optional: Make this item generate passive income
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="100"
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
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="24"
                />
              </div>
            </div>
          </div>

          {/* Role Settings */}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              🎭 Role Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Required Role ID
                </label>
                <input
                  type="text"
                  name="role_required_id"
                  value={formData.role_required_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="Role ID to require"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Role Given on Redeem
                </label>
                <input
                  type="text"
                  name="role_given_id"
                  value={formData.role_given_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="Role ID to give"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Role Removed on Redeem
                </label>
                <input
                  type="text"
                  name="role_removed_id"
                  value={formData.role_removed_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="Role ID to remove"
                />
              </div>
            </div>
          </div>

          {/* Advanced */}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              ⚙️ Advanced Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Required Balance ({currencyEmoji})
                </label>
                <input
                  type="number"
                  name="required_balance"
                  value={formData.required_balance}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="Minimum balance required"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Expires In (days)
                </label>
                <input
                  type="number"
                  name="expires_in_days"
                  value={formData.expires_in_days}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="Days until expiry"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Reply Message
                </label>
                <textarea
                  name="reply_message"
                  value={formData.reply_message}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition resize-none"
                  placeholder="Message shown after purchase..."
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/admin/casino"
              className="flex-1 px-6 py-3 text-center glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !formData.name || !formData.price}
              className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl apple-transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
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
