'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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

export default function AddItemPage() {
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Function to convert Discord emoji to CDN URL
  const getEmojiDisplay = (emoji: string, size: string = 'w-5 h-5') => {
    const match = emoji.match(/<a?:(\w+):(\d+)>/);
    if (match) {
      const [, name, id] = match;
      const isAnimated = emoji.startsWith('<a:');
      const extension = isAnimated ? 'gif' : 'png';
      const sizeMap: { [key: string]: number } = {
        'w-4 h-4': 32,
        'w-5 h-5': 40,
        'w-6 h-6': 48,
      };
      const imgSize = sizeMap[size] || 48;
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${extension}?size=${imgSize}&quality=lossless`}
          alt={name}
          className={`inline-block ${size}`}
          style={{ verticalAlign: 'middle' }}
        />
      );
    }
    return <span className="inline-block">{emoji}</span>;
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin');
    }
  }, [status, router]);

  useEffect(() => {
    fetch('/api/casino/shop')
      .then(res => res.json())
      .then(data => {
        if (data.currencyEmoji) setCurrencyEmoji(data.currencyEmoji);
      })
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/casino/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create item');
      }

      setSuccess(true);
      setTimeout(() => router.push('/admin/casino'), 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to create item');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
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
              Add New Item
            </h1>
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
              Create a new shop item
            </p>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3">
            <FiCheck className="w-5 h-5 text-green-500" />
            <span className="text-green-500 font-medium">Item created successfully! Redirecting...</span>
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
                  placeholder="e.g., Big Stack"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2 flex items-center gap-1">
                  Price ({getEmojiDisplay(currencyEmoji, 'w-4 h-4')}) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="730000"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Stock (leave empty for unlimited)
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  placeholder="Unlimited"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
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
                  placeholder="Bigger payouts. Faster cycle."
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition resize-none"
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
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                Image URL
              </label>
              <input
                type="url"
                name="thumbnail"
                value={formData.thumbnail}
                onChange={handleChange}
                placeholder="https://example.com/image.png"
                className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
              />
              {formData.thumbnail && (
                <div className="mt-4 p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
                  <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-2">Preview</p>
                  <div className="w-32 h-32 rounded-xl overflow-hidden bg-[rgb(var(--color-bg-secondary))]">
                    <img
                      src={formData.thumbnail}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Income Settings */}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              Income Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2 flex items-center gap-1">
                  Income Amount ({getEmojiDisplay(currencyEmoji, 'w-4 h-4')})
                </label>
                <input
                  type="number"
                  name="income_amount"
                  value={formData.income_amount}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 1000"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Income Interval (hours)
                </label>
                <input
                  type="number"
                  name="time_hours"
                  value={formData.time_hours}
                  onChange={handleChange}
                  min="1"
                  placeholder="e.g., 24"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                />
              </div>
            </div>
          </div>

          {/* Role Settings */}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              Role Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Role Required (ID)
                </label>
                <input
                  type="text"
                  name="role_required_id"
                  value={formData.role_required_id}
                  onChange={handleChange}
                  placeholder="Role ID"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Role Given (ID)
                </label>
                <input
                  type="text"
                  name="role_given_id"
                  value={formData.role_given_id}
                  onChange={handleChange}
                  placeholder="Role ID"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Role Removed (ID)
                </label>
                <input
                  type="text"
                  name="role_removed_id"
                  value={formData.role_removed_id}
                  onChange={handleChange}
                  placeholder="Role ID"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              Advanced Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2 flex items-center gap-1">
                  Required Balance ({getEmojiDisplay(currencyEmoji, 'w-4 h-4')})
                </label>
                <input
                  type="number"
                  name="required_balance"
                  value={formData.required_balance}
                  onChange={handleChange}
                  min="0"
                  placeholder="Minimum balance to purchase"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
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
                  placeholder="Never expires"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
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
                  placeholder="Custom message after purchase"
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Link
              href="/admin/casino"
              className="flex-1 sm:flex-none px-6 py-3 text-center bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl font-medium apple-transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !formData.name || !formData.price}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[rgb(var(--color-accent))] hover:bg-[rgb(var(--color-accent-hover))] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium apple-transition"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  Create Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
