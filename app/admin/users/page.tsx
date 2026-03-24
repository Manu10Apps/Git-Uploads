'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import AdminHeader from '@/app/admin/components/AdminHeader';

interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor';
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'editor'>('editor');
  const [editPassword, setEditPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('adminAuth');
    const role = localStorage.getItem('adminRole');
    const email = localStorage.getItem('adminEmail') || '';

    setAdminEmail(email);
    setAdminRole(role || '');

    if (!auth) {
      router.push('/admin/login');
      return;
    }

    if (role !== 'admin') {
      setError('Only admins can manage users.');
      setIsCheckingAuth(false);
      setLoading(false);
      return;
    }

    setIsCheckingAuth(false);
    void fetchUsers(email);
  }, [router]);

  const fetchUsers = async (emailOverride?: string) => {
    try {
      setLoading(true);
      setError('');

      const requestEmail = emailOverride ?? adminEmail;

      const response = await fetch('/api/admin/users', {
        headers: {
          'x-admin-email': requestEmail,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to load users.');
        return;
      }

      setUsers(data.users || []);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: AdminUserItem) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditRole(user.role);
    setEditPassword('');
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditName('');
    setEditRole('editor');
    setEditPassword('');
  };

  const handleUpdate = async (e: FormEvent, userId: number) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
        },
        body: JSON.stringify({
          id: userId,
          name: editName,
          role: editRole,
          password: editPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to update user.');
        return;
      }

      setSuccess('User updated successfully.');
      cancelEdit();
      await fetchUsers();
    } catch {
      setError('Failed to update user.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this user?')) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-email': adminEmail,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to delete user.');
        return;
      }

      setSuccess('User deleted successfully.');
      await fetchUsers();
    } catch {
      setError('Failed to delete user.');
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
        Kugaragara biri gukorwaho
      </div>
    );
  }

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-serif font-bold text-neutral-900 dark:text-white mb-2">
              Manage Users
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Create users from login page, then manage them here.
            </p>
            {adminRole === 'admin' && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                Logged in as: {adminEmail}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-neutral-600 dark:text-neutral-400">Kugaragara biri gukorwaho</div>
          ) : users.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm p-12 text-center text-neutral-600 dark:text-neutral-400">
              No users found.
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">Created</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {users.map((user) => {
                      const isEditing = editingUserId === user.id;

                      return (
                        <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors align-top">
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-sm"
                              />
                            ) : (
                              <span className="text-sm text-neutral-900 dark:text-white">{user.name}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{user.email}</td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value as 'admin' | 'editor')}
                                className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-sm"
                              >
                                <option value="editor">editor</option>
                                <option value="admin">admin</option>
                              </select>
                            ) : (
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                user.role === 'admin'
                                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                              }`}>
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            {isEditing ? (
                              <form onSubmit={(e) => handleUpdate(e, user.id)} className="space-y-2 w-56">
                                <input
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  placeholder="New password (optional)"
                                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-sm"
                                  minLength={8}
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    type="submit"
                                    className="inline-flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded"
                                  >
                                    <Save className="w-3 h-3" /> Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="inline-flex items-center gap-1 px-3 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-xs font-semibold rounded"
                                  >
                                    <X className="w-3 h-3" /> Cancel
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startEdit(user)}
                                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                                  title="Edit user"
                                >
                                  <Pencil className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                                </button>
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
