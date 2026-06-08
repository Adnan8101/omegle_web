'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiPackage, FiImage, FiAlertCircle, FiCheck, FiUpload, FiX, FiLoader } from 'react-icons/fi';
import EntityDropdown from '@/components/ui/entity-dropdown';

interface GuildRole {
  id: string;
  name: string;
  color: number;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [roles, setRoles] = useState<GuildRole[]>([]);
  const [selectedRequiredRoles, setSelectedRequiredRoles] = useState<string[]>([]);
  const parseRoleIds = (roleRef: string | null | undefined): string[] => {
    if (!roleRef) return [];
    const unique = new Set<string>();
    const parts = roleRef.split(/[\s,|/]+/).filter(Boolean);
    for (const part of parts) {
      const trimmed = part.trim();
      if (/^\d{17,20}$/.test(trimmed)) unique.add(trimmed);
      else {
        const match = trimmed.match(/^<@&?(\d{17,20})>$/);
        if (match) unique.add(match[1]);
      }
    }
    return Array.from(unique);
  };

  
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
    if (status === 'authenticated' && itemId) {
      fetchItem();
      fetch('/api/casino/shop')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.roles)) setRoles(data.roles);
        })
        .catch(() => {});
    }
  }, [status, itemId]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, role_required_id: selectedRequiredRoles.join(',') }));
  }, [selectedRequiredRoles]);

  const fetchItem = async () => {
    try {
      const res = await fetch(`/api/casino/shop/${itemId}`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch item');
      }

      const item = data.item;
      const toInput = (value: number | null | undefined) =>
        value === null || value === undefined ? '' : String(value);

      setFormData({
        name: item.name || '',
        price: toInput(item.price),
        description: item.description || '',
        thumbnail: item.thumbnail || '',
        stock: toInput(item.stock),
        income_amount: toInput(item.income_amount),
        time_hours: toInput(item.time_hours),
        role_required_id: item.role_required_id || '',
        role_given_id: item.role_given_id || '',
        role_removed_id: item.role_removed_id || '',
        required_balance: toInput(item.required_balance),
        reply_message: item.reply_message || '',
        expires_in_days: toInput(item.expires_in_days),
      });
      setSelectedRequiredRoles(Array.isArray(item.role_required_ids) ? item.role_required_ids : parseRoleIds(item.role_required_id || ''));
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

  
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        let { width, height } = img;
        const maxSize = 512;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx!.imageSmoothingEnabled = true;
        ctx!.imageSmoothingQuality = 'high';
        ctx!.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/webp',
          0.85
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size: 10MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const compressedFile = await compressImage(file);
      const uploadFormData = new FormData();
      uploadFormData.append('file', compressedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setFormData(prev => ({ ...prev, thumbnail: data.url }));
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = async () => {
    if (!formData.thumbnail) return;
    
    if (formData.thumbnail.includes('blob.vercel-storage.com')) {
      try {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formData.thumbnail }),
        });
      } catch (err) {
        console.error('Failed to delete old image:', err);
      }
    }
    
    setFormData(prev => ({ ...prev, thumbnail: '' }));
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
        {}
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

        {}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl flex items-center gap-3">
            <FiCheck className="w-5 h-5 text-green-500" />
            <span className="text-green-500 font-medium">Item updated successfully! Redirecting...</span>
          </div>
        )}

        {}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-500">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {}
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
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2 flex items-center gap-1">
                  Price ({getEmojiDisplay(currencyEmoji, 'w-4 h-4')}) *
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

          {}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4 flex items-center gap-2">
              <FiImage className="w-5 h-5 text-[rgb(var(--color-accent))]" />
              Thumbnail
            </h2>
            <div className="space-y-4">
              {}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Upload Image
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl border border-dashed border-[rgb(var(--color-border))] cursor-pointer apple-transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploading ? (
                      <>
                        <FiLoader className="w-5 h-5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <FiUpload className="w-5 h-5" />
                        <span>Click to upload image</span>
                      </>
                    )}
                  </label>
                </div>
                <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2">
                  Supported: JPEG, PNG, GIF, WebP. Max 10MB. Images are automatically compressed.
                </p>
              </div>

              {}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[rgb(var(--color-border))]"></div>
                <span className="text-xs text-[rgb(var(--color-text-tertiary))]">OR</span>
                <div className="flex-1 h-px bg-[rgb(var(--color-border))]"></div>
              </div>

              {}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl border border-[rgb(var(--color-border))] focus:border-[rgb(var(--color-accent))] focus:outline-none apple-transition"
                  placeholder="https://example.com/image.png"
                />
              </div>

              {}
              {formData.thumbnail && (
                <div className="p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Preview</p>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg apple-transition"
                      title="Remove image"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-32 h-32 rounded-xl overflow-hidden bg-[rgb(var(--color-bg-secondary))]">
                    <img
                      src={formData.thumbnail}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                  {formData.thumbnail.includes('blob.vercel-storage.com') && (
                    <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                      <FiCheck className="w-3 h-3" />
                      Uploaded to cloud storage
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              💰 Income Settings
            </h2>
            <p className="text-sm text-[rgb(var(--color-text-tertiary))] mb-4">
              Optional: Make this item generate passive income
            </p>
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

          {}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              🎭 Role Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--color-text-secondary))] mb-2">
                  Required Role(s)
                </label>
                <EntityDropdown
                  options={roles.map((role) => ({ id: role.id, name: role.name, color: role.color }))}
                  selectedIds={selectedRequiredRoles}
                  onChange={setSelectedRequiredRoles}
                  multiple
                  placeholder="Select required roles"
                  searchPlaceholder="Search roles"
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

          {}
          <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--color-text-primary))] mb-4">
              ⚙️ Advanced Settings
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

          {}
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
