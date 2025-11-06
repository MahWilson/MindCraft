'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Edit2, Trash2, Save, X, User } from 'lucide-react';

export default function ManageUsersPage() {
	const router = useRouter();
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [role, setRole] = useState(null);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [editingUserId, setEditingUserId] = useState(null);
	const [editName, setEditName] = useState('');
	const [editEmail, setEditEmail] = useState('');
	const [editRole, setEditRole] = useState('');
	const [profilePicture, setProfilePicture] = useState(null);
	const [profilePictureUrl, setProfilePictureUrl] = useState('');
	const [uploading, setUploading] = useState(false);
	const [deletingUserId, setDeletingUserId] = useState(null);

	const loadUsers = async () => {
		try {
			// Fetch directly from Firestore (client-side has auth context)
			const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
			const usersSnapshot = await getDocs(usersQuery);
			const usersList = usersSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data(),
			}));
			setUsers(usersList);
		} catch (err) {
			console.error('Error loading users:', err);
			// Check if it's a permission error
			if (err.code === 'permission-denied') {
				setError('Permission denied. Please check Firestore security rules. Make sure you are logged in and have admin role.');
			} else {
				setError('Failed to load users: ' + (err.message || 'Unknown error'));
			}
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const userRole = userDoc.data().role;
					setRole(userRole);
					
					// Only admins can access
					if (userRole !== 'admin') {
						router.push('/dashboard/admin');
						return;
					}
					
					// Load users once role is confirmed
					loadUsers();
				}
			} else {
				router.push('/login');
			}
		});
		return () => unsubscribe();
	}, [router]);

	const startEdit = (user) => {
		setEditingUserId(user.id);
		setEditName(user.name || '');
		setEditEmail(user.email || '');
		setEditRole(user.role || '');
		setProfilePictureUrl(user.profilePicture || '');
		setProfilePicture(null);
		setError('');
		setSuccess('');
	};

	const cancelEdit = () => {
		setEditingUserId(null);
		setEditName('');
		setEditEmail('');
		setEditRole('');
		setProfilePictureUrl('');
		setProfilePicture(null);
		setError('');
		setSuccess('');
	};

	const handleProfilePictureChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			if (file.size > 5 * 1024 * 1024) {
				setError('Profile picture must be less than 5MB');
				return;
			}
			if (!file.type.startsWith('image/')) {
				setError('File must be an image');
				return;
			}
			setProfilePicture(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setProfilePictureUrl(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const uploadProfilePicture = async (userId) => {
		if (!profilePicture) return null;

		setUploading(true);
		try {
			const fileRef = ref(storage, `profile-pictures/${userId}/${Date.now()}_${profilePicture.name}`);
			await uploadBytes(fileRef, profilePicture);
			const url = await getDownloadURL(fileRef);
			return url;
		} catch (err) {
			console.error('Error uploading profile picture:', err);
			throw err;
		} finally {
			setUploading(false);
		}
	};

	const saveEdit = async () => {
		setError('');
		setSuccess('');

		if (!editName.trim()) {
			setError('Name is required');
			return;
		}

		try {
			let pictureUrl = profilePictureUrl;

			if (profilePicture) {
				pictureUrl = await uploadProfilePicture(editingUserId);
			}

			const updateData = {
				name: editName.trim(),
			};

			if (pictureUrl) {
				updateData.profilePicture = pictureUrl;
			}

			await updateDoc(doc(db, 'users', editingUserId), updateData);

			setSuccess('User updated successfully!');
			setTimeout(() => setSuccess(''), 3000);
			cancelEdit();
			loadUsers();
		} catch (err) {
			console.error('Error updating user:', err);
			setError('Failed to update user');
		}
	};

	const handleDelete = async (userId, userName) => {
		if (!confirm(`Are you sure you want to delete ${userName}'s account? This action cannot be undone.`)) {
			return;
		}

		setDeletingUserId(userId);
		setError('');
		setSuccess('');

		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to delete user');
			}

			setSuccess('User account deleted successfully!');
			setTimeout(() => setSuccess(''), 3000);
			loadUsers();
		} catch (err) {
			console.error('Error deleting user:', err);
			setError(err.message || 'Failed to delete user');
		} finally {
			setDeletingUserId(null);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-body text-muted-foreground">Loading users...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-h1 flex items-center gap-2">
						<Users className="h-8 w-8" />
						Manage Users
					</h1>
					<p className="text-body text-muted-foreground mt-2">
						View and manage all user accounts
					</p>
				</div>
			</div>

			{error && (
				<Card className="border-error bg-error/5">
					<CardContent className="pt-6">
						<p className="text-body text-error">{error}</p>
					</CardContent>
				</Card>
			)}

			{success && (
				<Card className="border-success bg-success/5">
					<CardContent className="pt-6">
						<p className="text-body text-success">{success}</p>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>All Users</CardTitle>
					<CardDescription>
						{users.length} user{users.length !== 1 ? 's' : ''} registered
					</CardDescription>
				</CardHeader>
				<CardContent>
					{users.length === 0 ? (
						<p className="text-body text-muted-foreground text-center py-8">
							No users found
						</p>
					) : (
						<div className="space-y-4">
							{users.map((user) => (
								<div
									key={user.id}
									className="flex items-center gap-4 p-4 rounded-lg border border-border bg-white hover:border-primary/30 transition-colors duration-200"
								>
									{/* Profile Picture */}
									{user.profilePicture ? (
										<img
											src={user.profilePicture}
											alt={user.name}
											className="w-12 h-12 rounded-full object-cover border border-border"
										/>
									) : (
										<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-border">
											<User className="h-6 w-6 text-primary" />
										</div>
									)}

									{/* User Info */}
									{editingUserId === user.id ? (
										<div className="flex-1 space-y-3">
											<div>
												<label className="block mb-1 text-xs font-medium text-neutralDark">
													Name
												</label>
												<Input
													value={editName}
													onChange={(e) => setEditName(e.target.value)}
													placeholder="User name"
													className="h-9"
												/>
											</div>
											<div>
												<label className="block mb-1 text-xs font-medium text-neutralDark">
													Email
												</label>
												<Input
													value={editEmail}
													disabled
													className="h-9 bg-neutralLight"
												/>
											</div>
											<div>
												<label className="block mb-1 text-xs font-medium text-neutralDark">
													Role
												</label>
												<Input
													value={editRole}
													disabled
													className="h-9 bg-neutralLight capitalize"
												/>
											</div>
											<div>
												<label className="block mb-1 text-xs font-medium text-neutralDark">
													Profile Picture
												</label>
												<input
													type="file"
													accept="image/*"
													onChange={handleProfilePictureChange}
													className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-white hover:file:opacity-90"
													disabled={uploading}
												/>
											</div>
											<div className="flex items-center gap-2">
												<Button
													size="sm"
													onClick={saveEdit}
													disabled={uploading || !editName.trim()}
												>
													<Save className="h-4 w-4 mr-1" />
													Save
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={cancelEdit}
													disabled={uploading}
												>
													<X className="h-4 w-4 mr-1" />
													Cancel
												</Button>
											</div>
										</div>
									) : (
										<>
											<div className="flex-1 min-w-0">
												<p className="text-body font-medium text-neutralDark">{user.name}</p>
												<p className="text-caption text-muted-foreground">{user.email}</p>
												<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary capitalize mt-1">
													{user.role}
												</span>
											</div>
											<div className="flex items-center gap-2 flex-shrink-0">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => startEdit(user)}
													className="hover:bg-primary/10"
													title="Edit user"
												>
													<Edit2 className="h-5 w-5" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDelete(user.id, user.name)}
													className="text-error hover:text-error hover:bg-error/10"
													disabled={deletingUserId === user.id}
													title="Delete user"
												>
													<Trash2 className="h-5 w-5" />
												</Button>
											</div>
										</>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

