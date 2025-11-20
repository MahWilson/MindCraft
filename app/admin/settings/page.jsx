'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';

export default function AdminSettingsPage() {
	const router = useRouter();
	const [userRole, setUserRole] = useState(null);
	const [loading, setLoading] = useState(true);
	const [logoUrl, setLogoUrl] = useState('');
	const [logoFile, setLogoFile] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				const { doc, getDoc } = await import('firebase/firestore');
				const userDoc = await getDoc(doc(db, 'users', user.uid));
				if (userDoc.exists()) {
					const role = userDoc.data().role;
					setUserRole(role);
					if (role !== 'admin') {
						router.push('/dashboard/student');
					} else {
						loadSettings();
					}
				}
			} else {
				router.push('/login');
			}
		});

		return () => unsubscribe();
	}, [router]);

	async function loadSettings() {
		try {
			const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
			if (settingsDoc.exists()) {
				const data = settingsDoc.data();
				setLogoUrl(data.logoUrl || '');
			}
		} catch (err) {
			console.error('Error loading settings:', err);
		} finally {
			setLoading(false);
		}
	}

	function handleLogoChange(e) {
		const file = e.target.files[0];
		if (file) {
			if (file.size > 2 * 1024 * 1024) {
				setError('Logo must be less than 2MB');
				return;
			}
			if (!file.type.startsWith('image/')) {
				setError('File must be an image');
				return;
			}
			setLogoFile(file);
			setError('');
			// Preview
			const reader = new FileReader();
			reader.onloadend = () => {
				setLogoUrl(reader.result);
			};
			reader.readAsDataURL(file);
		}
	}

	async function handleUploadLogo() {
		if (!logoFile || !auth.currentUser) {
			setError('Please select a logo file');
			return;
		}

		setUploading(true);
		setError('');

		try {
			const fileRef = ref(storage, `app-logo/logo_${Date.now()}_${logoFile.name}`);
			await uploadBytes(fileRef, logoFile);
			const url = await getDownloadURL(fileRef);
			setLogoUrl(url);
			setSuccess('Logo uploaded successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error uploading logo:', err);
			setError('Failed to upload logo: ' + (err.message || 'Unknown error'));
		} finally {
			setUploading(false);
		}
	}

	async function handleSave() {
		if (!logoUrl) {
			setError('Please upload a logo first');
			return;
		}

		setSaving(true);
		setError('');

		try {
			await setDoc(doc(db, 'settings', 'app'), {
				logoUrl,
				updatedAt: new Date(),
				updatedBy: auth.currentUser.uid,
			}, { merge: true });

			setSuccess('Settings saved successfully!');
			setTimeout(() => setSuccess(''), 3000);
		} catch (err) {
			console.error('Error saving settings:', err);
			setError('Failed to save settings: ' + (err.message || 'Unknown error'));
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Admin Settings</h1>
					<p className="text-body text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (userRole !== 'admin') {
		return (
			<div className="space-y-8">
				<div>
					<h1 className="text-h1 text-neutralDark mb-2">Admin Settings</h1>
					<p className="text-body text-muted-foreground">Access denied. Admin only.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-h1 text-neutralDark mb-2">Admin Settings</h1>
				<p className="text-body text-muted-foreground">Manage application settings</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Application Logo</CardTitle>
					<CardDescription>Upload your team logo to display in the sidebar</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{error && (
						<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					{success && (
						<div className="p-3 bg-success/10 border border-success/20 rounded-lg">
							<p className="text-sm text-success">{success}</p>
						</div>
					)}

					<div className="flex items-center gap-4">
						{logoUrl ? (
							<div className="flex items-center gap-4">
								<img
									src={logoUrl}
									alt="App Logo"
									className="h-12 w-12 object-contain border border-border rounded"
								/>
								<div>
									<p className="text-sm font-medium">Current Logo</p>
									<p className="text-xs text-muted-foreground">Preview shown above</p>
								</div>
							</div>
						) : (
							<div className="flex items-center gap-4">
								<div className="h-12 w-12 border-2 border-dashed border-border rounded flex items-center justify-center">
									<ImageIcon className="h-6 w-6 text-muted-foreground" />
								</div>
								<div>
									<p className="text-sm font-medium">No logo uploaded</p>
									<p className="text-xs text-muted-foreground">Upload a logo to display in sidebar</p>
								</div>
							</div>
						)}
					</div>

					<div className="space-y-2">
						<input
							type="file"
							id="logo"
							accept="image/*"
							onChange={handleLogoChange}
							className="hidden"
						/>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => document.getElementById('logo')?.click()}
								disabled={uploading}
							>
								<Upload className="h-4 w-4 mr-2" />
								Choose Logo
							</Button>
							{logoFile && (
								<Button
									type="button"
									onClick={handleUploadLogo}
									disabled={uploading}
								>
									{uploading ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											Uploading...
										</>
									) : (
										<>
											<Upload className="h-4 w-4 mr-2" />
											Upload
										</>
									)}
								</Button>
							)}
						</div>
						<p className="text-xs text-muted-foreground">
							Recommended: Square image (e.g., 128x128px or 256x256px), max 2MB
						</p>
					</div>

					<div className="pt-4 border-t">
						<Button
							onClick={handleSave}
							disabled={saving || !logoUrl}
						>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								'Save Settings'
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

