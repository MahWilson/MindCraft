'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import DeleteUser from './delete/DeleteUser';

export default function UsersPage() {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [filterRole, setFilterRole] = useState('all');
	const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
	const [sidebarMinimized, setSidebarMinimized] = useState(false);

	useEffect(() => {
		fetchUsers();
	}, []);

	async function fetchUsers() {
		try {
			const res = await fetch('/api/users');
			if (!res.ok) throw new Error('Failed to fetch users');
			const data = await res.json();
			setUsers(data.users || []);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}

	const filteredUsers = users.filter(user => {
		const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
							 user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
							 user.username?.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesRole = filterRole === 'all' || user.role === filterRole;
		return matchesSearch && matchesRole;
	});

	if (loading) {
		return (
			<div style={{ 
				minHeight: '100vh', 
				backgroundColor: '#f8fafc',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center'
			}}>
				<div style={{ 
					display: 'flex', 
					flexDirection: 'column',
					alignItems: 'center', 
					gap: '20px',
					color: '#64748b',
					fontSize: '18px'
				}}>
					<div style={{
						width: '60px',
						height: '60px',
						border: '4px solid #e2e8f0',
						borderTop: '4px solid #3b82f6',
						borderRadius: '50%',
						animation: 'spin 1s linear infinite'
					}}></div>
					<div style={{ fontWeight: '500' }}>Loading your dashboard...</div>
				</div>
				<style jsx>{`
					@keyframes spin {
						0% { transform: rotate(0deg); }
						100% { transform: rotate(360deg); }
					}
				`}</style>
			</div>
		);
	}

	return (
		<div style={{ 
			minHeight: '100vh', 
			backgroundColor: '#f8fafc',
			fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
		}}>
			<Sidebar currentPage="users" onToggle={setSidebarMinimized} />

			{/* Main Content */}
			<div style={{ 
				marginLeft: sidebarMinimized ? '80px' : '280px', 
				padding: '32px 40px', 
				transition: 'margin-left 0.3s ease-in-out',
				minHeight: '100vh',
				boxSizing: 'border-box'
			}}>
				{/* Header */}
				<div style={{ 
					marginBottom: '32px',
					backgroundColor: 'white',
					borderRadius: '16px',
					padding: '32px',
					boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
				}}>
					<div>
						<h1 style={{ 
							fontSize: '36px', 
							fontWeight: '800', 
							color: '#1e293b',
							margin: '0 0 8px 0' 
						}}>
							User Management
						</h1>
						<p style={{ 
							color: '#64748b', 
							fontSize: '16px', 
							margin: 0,
							fontWeight: '500'
						}}>
							Manage your platform users with style and efficiency
						</p>
					</div>
				</div>

				{/* Stats Cards */}
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
					gap: '24px', 
					marginBottom: '32px' 
				}}>
					{[
						{ label: 'Total Users', value: users.length },
						{ label: 'Students', value: users.filter(u => u.role === 'student').length, icon: 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5' },
						{ label: 'Teachers', value: users.filter(u => u.role === 'teacher').length },
						{ label: 'Active Users', value: users.filter(u => u.status === 'active').length }
					].map((stat, index) => (
						<div key={index} style={{
							backgroundColor: 'white',
							padding: '28px',
							borderRadius: '16px',
							boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
							transition: 'transform 0.3s ease, box-shadow 0.3s ease',
							cursor: 'pointer'
						}}
						onMouseOver={(e) => {
							e.currentTarget.style.transform = 'translateY(-5px)';
							e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
						}}
						onMouseOut={(e) => {
							e.currentTarget.style.transform = 'translateY(0)';
							e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
						}}>
							<div style={{ marginBottom: '16px' }}>
								<div style={{ 
									color: '#64748b', 
									fontSize: '14px', 
									fontWeight: '600',
									textTransform: 'uppercase',
									letterSpacing: '0.5px'
								}}>
									{stat.label}
								</div>
							</div>
							<div style={{ 
								fontSize: '32px', 
								fontWeight: '800', 
								color: '#1e293b',
								lineHeight: '1'
							}}>
								{stat.value}
							</div>
						</div>
					))}
				</div>

				{/* Controls */}
				<div style={{
					backgroundColor: 'white',
					padding: '20px',
					borderRadius: '12px',
					boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
					marginBottom: '20px'
				}}>
					<div style={{ 
						display: 'flex', 
						justifyContent: 'space-between', 
						alignItems: 'center',
						flexWrap: 'wrap',
						gap: '16px'
					}}>
						<div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1 }}>
							<div style={{ minWidth: '280px' }}>
								<input
									type="text"
									placeholder="Search users..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									style={{
										width: '100%',
										padding: '10px 14px',
										border: '1px solid #d1d5db',
										borderRadius: '8px',
										fontSize: '14px',
										outline: 'none',
										transition: 'all 0.2s ease',
										backgroundColor: 'white',
										boxSizing: 'border-box'
									}}
									onFocus={(e) => {
										e.target.style.borderColor = '#3b82f6';
										e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
									}}
									onBlur={(e) => {
										e.target.style.borderColor = '#d1d5db';
										e.target.style.boxShadow = 'none';
									}}
								/>
							</div>
							
							<select
								value={filterRole}
								onChange={(e) => setFilterRole(e.target.value)}
								style={{
									padding: '10px 14px',
									border: '1px solid #d1d5db',
									borderRadius: '8px',
									fontSize: '14px',
									outline: 'none',
									backgroundColor: 'white',
									minWidth: '120px',
									cursor: 'pointer',
									fontWeight: '500',
									transition: 'all 0.2s ease',
									boxSizing: 'border-box'
								}}
							>
								<option value="all">All Roles</option>
								<option value="student">Students</option>
								<option value="teacher">Teachers</option>
							</select>

							{/* View Mode Toggle */}
							<div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
								<button
									onClick={() => setViewMode('grid')}
									style={{
										padding: '8px 12px',
										border: 'none',
										borderRadius: '6px',
										backgroundColor: viewMode === 'grid' ? '#3b82f6' : 'transparent',
										color: viewMode === 'grid' ? 'white' : '#64748b',
										cursor: 'pointer',
										transition: 'all 0.2s ease',
										boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none'
									}}
								>
									<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
										<path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
									</svg>
								</button>
								<button
									onClick={() => setViewMode('table')}
									style={{
										padding: '8px 12px',
										border: 'none',
										borderRadius: '6px',
										backgroundColor: viewMode === 'table' ? '#3b82f6' : 'transparent',
										color: viewMode === 'table' ? 'white' : '#64748b',
										cursor: 'pointer',
										transition: 'all 0.2s ease',
										boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none'
									}}
								>
									<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
										<path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
									</svg>
								</button>
							</div>
						</div>
						
						<button 
							onClick={() => setShowCreateForm(true)}
							style={{ 
								padding: '10px 20px', 
								backgroundColor: '#3b82f6', 
								color: 'white', 
								border: 'none', 
								borderRadius: '8px',
								fontSize: '14px',
								fontWeight: '500',
								cursor: 'pointer',
								transition: 'all 0.2s ease',
								whiteSpace: 'nowrap'
							}}
							onMouseOver={(e) => {
								e.target.style.backgroundColor = '#2563eb';
							}}
							onMouseOut={(e) => {
								e.target.style.backgroundColor = '#3b82f6';
							}}
						>
							Add New User
						</button>
					</div>
				</div>

				{error && (
					<div style={{ 
						color: '#dc2626', 
						marginBottom: '24px', 
						padding: '16px 20px', 
						background: 'rgba(254, 242, 242, 0.9)',
						backdropFilter: 'blur(10px)',
						borderRadius: '12px',
						border: '1px solid #fecaca',
						fontSize: '14px',
						display: 'flex',
						alignItems: 'center',
						gap: '10px'
					}}>
						<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
						</svg>
						{error}
					</div>
				)}

				{showCreateForm && (
					<CreateUserForm 
						onClose={() => setShowCreateForm(false)}
						onSuccess={() => {
							setShowCreateForm(false);
							fetchUsers();
						}}
					/>
				)}

				<UserList users={filteredUsers} onUserUpdate={fetchUsers} viewMode={viewMode} />
			</div>
		</div>
	);
}

function CreateUserForm({ onClose, onSuccess }) {
	const [formData, setFormData] = useState({
		fullName: '',
		email: '',
		username: '',
		role: 'student'
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	async function handleSubmit(e) {
		e.preventDefault();
		setSubmitting(true);
		setError('');

		try {
			const res = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to create user');
			}

			onSuccess();
		} catch (err) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div style={{ 
			position: 'fixed', 
			top: 0, 
			left: 0, 
			right: 0, 
			bottom: 0, 
			backgroundColor: 'rgba(0, 0, 0, 0.5)', 
			display: 'flex', 
			alignItems: 'center', 
			justifyContent: 'center',
			zIndex: 1000
		}}>
			<div style={{ 
				backgroundColor: 'white',
				padding: '24px', 
				borderRadius: '12px', 
				width: '100%', 
				maxWidth: '420px',
				boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				margin: '20px'
			}}>
				<div>
					<div style={{ marginBottom: '20px' }}>
						<h2 style={{ 
							fontSize: '20px',
							fontWeight: '600',
							color: '#1e293b',
							margin: '0 0 6px 0'
						}}>
							Create New User
						</h2>
						<p style={{
							color: '#64748b',
							fontSize: '14px',
							margin: 0
						}}>
							Add a new member to your platform
						</p>
					</div>
					
					<form onSubmit={handleSubmit}>
						<div style={{ marginBottom: '16px' }}>
							<label style={{ 
								display: 'block', 
								marginBottom: '6px',
								fontSize: '13px',
								fontWeight: '500',
								color: '#374151'
							}}>
								Full Name
							</label>
							<input
								required
								value={formData.fullName}
								onChange={(e) => setFormData({...formData, fullName: e.target.value})}
								style={{ 
									width: '100%', 
									padding: '12px 14px', 
									border: '1px solid #d1d5db', 
									borderRadius: '8px',
									fontSize: '14px',
									outline: 'none',
									transition: 'all 0.2s ease',
									backgroundColor: 'white',
									boxSizing: 'border-box'
								}}
								onFocus={(e) => {
									e.target.style.borderColor = '#3b82f6';
									e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
								}}
								onBlur={(e) => {
									e.target.style.borderColor = '#d1d5db';
									e.target.style.boxShadow = 'none';
								}}
								placeholder="Enter full name"
							/>
						</div>

						<div style={{ marginBottom: '16px' }}>
							<label style={{ 
								display: 'block', 
								marginBottom: '6px',
								fontSize: '13px',
								fontWeight: '500',
								color: '#374151'
							}}>
								Email Address
							</label>
							<input
								type="email"
								required
								value={formData.email}
								onChange={(e) => setFormData({...formData, email: e.target.value})}
								style={{ 
									width: '100%', 
									padding: '12px 14px', 
									border: '1px solid #d1d5db', 
									borderRadius: '8px',
									fontSize: '14px',
									outline: 'none',
									transition: 'all 0.2s ease',
									backgroundColor: 'white',
									boxSizing: 'border-box'
								}}
								onFocus={(e) => {
									e.target.style.borderColor = '#3b82f6';
									e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
								}}
								onBlur={(e) => {
									e.target.style.borderColor = '#d1d5db';
									e.target.style.boxShadow = 'none';
								}}
								placeholder="user@example.com"
							/>
						</div>

						<div style={{ marginBottom: '16px' }}>
							<label style={{ 
								display: 'block', 
								marginBottom: '6px',
								fontSize: '13px',
								fontWeight: '500',
								color: '#374151'
							}}>
								Username
							</label>
							<input
								required
								value={formData.username}
								onChange={(e) => setFormData({...formData, username: e.target.value})}
								style={{ 
									width: '100%', 
									padding: '12px 14px', 
									border: '1px solid #d1d5db', 
									borderRadius: '8px',
									fontSize: '14px',
									outline: 'none',
									transition: 'all 0.2s ease',
									backgroundColor: 'white',
									boxSizing: 'border-box'
								}}
								onFocus={(e) => {
									e.target.style.borderColor = '#3b82f6';
									e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
								}}
								onBlur={(e) => {
									e.target.style.borderColor = '#d1d5db';
									e.target.style.boxShadow = 'none';
								}}
								placeholder="Enter username"
							/>
						</div>

						<div style={{ marginBottom: '24px' }}>
							<label style={{ 
								display: 'block', 
								marginBottom: '6px',
								fontSize: '13px',
								fontWeight: '500',
								color: '#374151'
							}}>
								Role
							</label>
							<select
								value={formData.role}
								onChange={(e) => setFormData({...formData, role: e.target.value})}
								style={{ 
									width: '100%', 
									padding: '12px 14px', 
									border: '1px solid #d1d5db', 
									borderRadius: '8px',
									fontSize: '14px',
									outline: 'none',
									backgroundColor: 'white',
									cursor: 'pointer',
									boxSizing: 'border-box'
								}}
							>
								<option value="student">Student</option>
								<option value="teacher">Teacher</option>
							</select>
						</div>

						{error && (
							<div style={{ 
								color: '#dc2626', 
								marginBottom: '16px',
								padding: '10px 12px',
								backgroundColor: '#fef2f2',
								border: '1px solid #fecaca',
								borderRadius: '6px',
								fontSize: '13px'
							}}>
								{error}
							</div>
						)}

						<div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
							<button 
								type="button" 
								onClick={onClose}
								style={{ 
									padding: '10px 20px', 
									border: '1px solid #d1d5db', 
									borderRadius: '8px', 
									backgroundColor: 'white',
									color: '#64748b',
									fontSize: '14px',
									fontWeight: '500',
									cursor: 'pointer',
									transition: 'all 0.2s ease'
								}}
								onMouseOver={(e) => {
									e.target.style.backgroundColor = '#f8fafc';
									e.target.style.borderColor = '#cbd5e1';
								}}
								onMouseOut={(e) => {
									e.target.style.backgroundColor = 'white';
									e.target.style.borderColor = '#d1d5db';
								}}
							>
								Cancel
							</button>
							<button 
								type="submit" 
								disabled={submitting}
								style={{ 
									padding: '10px 20px', 
									backgroundColor: submitting ? '#9ca3af' : '#3b82f6', 
									color: 'white', 
									border: 'none', 
									borderRadius: '8px',
									fontSize: '14px',
									fontWeight: '500',
									cursor: submitting ? 'not-allowed' : 'pointer',
									transition: 'all 0.2s ease',
									display: 'flex',
									alignItems: 'center',
									gap: '8px'
								}}
								onMouseOver={(e) => {
									if (!submitting) {
										e.target.style.backgroundColor = '#2563eb';
									}
								}}
								onMouseOut={(e) => {
									if (!submitting) {
										e.target.style.backgroundColor = '#3b82f6';
									}
								}}
							>
								{submitting && (
									<div style={{
										width: '16px',
										height: '16px',
										border: '2px solid transparent',
										borderTop: '2px solid white',
										borderRadius: '50%',
										animation: 'spin 1s linear infinite'
									}}></div>
								)}
								{submitting ? 'Creating...' : 'Create User'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}

function UserList({ users, onUserUpdate, viewMode }) {
	const [editingUser, setEditingUser] = useState(null);
	const [userToDelete, setUserToDelete] = useState(null);

	if (users.length === 0) {
		return (
			<div style={{
				backgroundColor: 'white',
				borderRadius: '16px',
				padding: '60px 32px',
				textAlign: 'center',
				boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
			}}>
				<h3 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 12px 0' }}>
					No users found
				</h3>
				<p style={{ color: '#64748b', fontSize: '16px', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
					Get started by creating your first user account. Click the "Add New User" button above to begin.
				</p>
			</div>
		);
	}

	if (viewMode === 'grid') {
		return (
			<div>
				<div style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
					gap: '24px'
				}}>
					{users.map((user) => (
						<div 
							key={user.id}
							style={{
								backgroundColor: 'white',
								borderRadius: '16px',
								padding: '24px',
								boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
								transition: 'all 0.3s ease',
								cursor: 'pointer'
							}}
							onMouseOver={(e) => {
								e.currentTarget.style.transform = 'translateY(-4px)';
								e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
							}}
							onMouseOut={(e) => {
								e.currentTarget.style.transform = 'translateY(0)';
								e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
							}}
						>
							<div>
								{/* User Avatar and Name */}
								<div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
									<div style={{
										width: '60px',
										height: '60px',
										borderRadius: '50%',
										backgroundColor: '#3b82f6',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										color: 'white',
										fontSize: '24px',
										fontWeight: '700',
										marginRight: '16px',
										boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
									}}>
										{user.name?.charAt(0)?.toUpperCase() || 'U'}
									</div>
									<div>
										<h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px 0' }}>
											{user.name || 'Unknown User'}
										</h3>
										<p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
											@{user.username}
										</p>
									</div>
								</div>

								{/* User Details */}
								<div style={{ marginBottom: '16px' }}>
									<div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
										<svg width="16" height="16" fill="#64748b" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
											<path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
											<path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
										</svg>
										<span style={{ color: '#64748b', fontSize: '14px' }}>{user.email}</span>
									</div>
									{user.class && (
										<div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
											<svg width="16" height="16" fill="#64748b" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
												<path d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
											</svg>
											<span style={{ color: '#64748b', fontSize: '14px' }}>Class {user.class}</span>
										</div>
									)}
								</div>

								{/* Badges and Actions */}
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<div style={{ display: 'flex', gap: '8px' }}>
										<span style={{
											padding: '6px 12px',
											borderRadius: '20px',
											fontSize: '12px',
											fontWeight: '600',
											backgroundColor: user.role === 'teacher' ? '#10b981' : '#8b5cf6',
											color: 'white',
											textTransform: 'capitalize',
											boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
										}}>
											{user.role}
										</span>
										<span style={{
											padding: '6px 12px',
											borderRadius: '20px',
											fontSize: '12px',
											fontWeight: '600',
											backgroundColor: user.status === 'active' ? '#22c55e' : '#ef4444',
											color: 'white',
											textTransform: 'capitalize',
											boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
										}}>
											{user.status}
										</span>
									</div>
									<button
										onClick={(e) => {
											e.stopPropagation();
											setEditingUser(user);
										}}
										style={{
											padding: '8px 16px',
											backgroundColor: 'white',
											color: '#3b82f6',
											border: '2px solid #e2e8f0',
											borderRadius: '10px',
											fontSize: '12px',
											fontWeight: '600',
											cursor: 'pointer',
											transition: 'all 0.2s ease',
											boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
										}}
										onMouseOver={(e) => {
											e.target.style.backgroundColor = '#3b82f6';
											e.target.style.color = 'white';
											e.target.style.borderColor = '#3b82f6';
										}}
										onMouseOut={(e) => {
											e.target.style.backgroundColor = 'white';
											e.target.style.color = '#3b82f6';
											e.target.style.borderColor = '#e2e8f0';
										}}
									>
										Edit User
									</button>
								</div>
							</div>
						</div>
					))}
				</div>

				{editingUser && (
					<EditUserForm 
						user={editingUser}
						onClose={() => setEditingUser(null)}
						onSuccess={() => {
							setEditingUser(null);
							onUserUpdate();
						}}
					/>
				)}
			</div>
		);
	}

	// Table view
	return (
		<div>
			<div style={{
				backgroundColor: 'white',
				borderRadius: '16px',
				boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				overflow: 'hidden'
			}}>
				<div style={{ 
					display: 'grid', 
					gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr', 
					gap: '0',
					backgroundColor: '#f8fafc',
					padding: '20px 28px',
					fontSize: '13px',
					fontWeight: '700',
					color: '#374151',
					textTransform: 'uppercase',
					letterSpacing: '0.5px'
				}}>
					<div>User</div>
					<div>Contact</div>
					<div>Username</div>
					<div>Role</div>
					<div>Status</div>
					<div>Actions</div>
				</div>

				{users.map((user, index) => (
					<div 
						key={user.id}
						style={{
							display: 'grid',
							gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr',
							gap: '0',
							padding: '24px 28px',
							borderBottom: index < users.length - 1 ? '1px solid #f1f5f9' : 'none',
							alignItems: 'center',
							transition: 'all 0.2s ease',
							cursor: 'pointer'
						}}
						onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
						onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
							<div style={{
								width: '48px',
								height: '48px',
								borderRadius: '50%',
								backgroundColor: '#3b82f6',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: 'white',
								fontSize: '18px',
								fontWeight: '700',
								boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
							}}>
								{user.name?.charAt(0)?.toUpperCase() || 'U'}
							</div>
							<div>
								<div style={{ fontWeight: '600', color: '#1e293b', fontSize: '15px', marginBottom: '2px' }}>
									{user.name || 'Unknown'}
								</div>
								<div style={{ color: '#64748b', fontSize: '13px' }}>
									{user.class ? `Class ${user.class}` : 'No class assigned'}
								</div>
							</div>
						</div>

						<div style={{ color: '#64748b', fontSize: '14px' }}>
							{user.email}
						</div>

						<div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
							@{user.username}
						</div>

						<div>
							<span style={{
								padding: '6px 12px',
								borderRadius: '20px',
								fontSize: '12px',
								fontWeight: '600',
								backgroundColor: user.role === 'teacher' ? '#10b981' : '#8b5cf6',
								color: 'white',
								textTransform: 'capitalize',
								boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
							}}>
								{user.role}
							</span>
						</div>

						<div>
							<span style={{
								padding: '6px 12px',
								borderRadius: '20px',
								fontSize: '12px',
								fontWeight: '600',
								backgroundColor: user.status === 'active' ? '#22c55e' : '#ef4444',
								color: 'white',
								textTransform: 'capitalize',
								boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
							}}>
								{user.status}
							</span>
						</div>

						<div>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setEditingUser(user);
								}}
								style={{
									padding: '8px 16px',
									backgroundColor: 'white',
									color: '#3b82f6',
									border: '2px solid #e2e8f0',
									borderRadius: '10px',
									fontSize: '12px',
									fontWeight: '600',
									cursor: 'pointer',
									transition: 'all 0.2s ease',
									boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
								}}
								onMouseOver={(e) => {
									e.target.style.backgroundColor = '#3b82f6';
									e.target.style.color = 'white';
									e.target.style.borderColor = '#3b82f6';
								}}
								onMouseOut={(e) => {
									e.target.style.backgroundColor = 'white';
									e.target.style.color = '#3b82f6';
									e.target.style.borderColor = '#e2e8f0';
								}}
							>
								Edit
							</button>
						</div>
					</div>
				))}
			</div>

			{editingUser && (
				<EditUserForm 
					user={editingUser}
					onClose={() => setEditingUser(null)}
					onSuccess={() => {
						setEditingUser(null);
						onUserUpdate();
					}}
				/>
			)}
			{userToDelete && (
				<DeleteUser
					user={userToDelete}
					onClose={() => setUserToDelete(null)}
					onSuccess={() => {
						setUserToDelete(null);
						onUserUpdate();
					}}
				/>
			)}
		</div>
	);
}

function EditUserForm({ user, onClose, onSuccess }) {
	const [formData, setFormData] = useState({
		name: user.name || '',
		email: user.email || '',
		class: user.class || '',
		status: user.status || 'active'
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	async function handleSubmit(e) {
		e.preventDefault();
		setSubmitting(true);
		setError('');

		try {
			const res = await fetch(`/api/users/${user.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to update user');
			}

			onSuccess();
		} catch (err) {
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div style={{ 
			position: 'fixed', 
			top: 0, 
			left: 0, 
			right: 0, 
			bottom: 0, 
			backgroundColor: 'rgba(15, 23, 42, 0.4)', 
			display: 'flex', 
			alignItems: 'center', 
			justifyContent: 'center',
			zIndex: 1000,
			backdropFilter: 'blur(8px)'
		}}>
			<div style={{ 
				backgroundColor: 'white', 
				padding: '28px', 
				borderRadius: '12px', 
				width: '100%', 
				maxWidth: '420px',
				boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
				border: '1px solid #e2e8f0'
			}}>
				<div style={{ marginBottom: '20px' }}>
					<h2 style={{ 
						fontSize: '20px',
						fontWeight: '600',
						color: '#0f172a',
						margin: '0 0 6px 0'
					}}>
						Edit User
					</h2>
					<p style={{
						color: '#64748b',
						fontSize: '14px',
						margin: 0
					}}>
						Update {user.name}'s account information
					</p>
				</div>
				
				<form onSubmit={handleSubmit}>
					<div style={{ marginBottom: '16px' }}>
						<label style={{ 
							display: 'block', 
							marginBottom: '6px',
							fontSize: '13px',
							fontWeight: '500',
							color: '#374151'
						}}>
							Full Name
						</label>
						<input
							required
							value={formData.name}
							onChange={(e) => setFormData({...formData, name: e.target.value})}
							style={{ 
								width: '100%', 
								padding: '10px 12px', 
								border: '1px solid #d1d5db', 
								borderRadius: '6px',
								fontSize: '14px',
								outline: 'none',
								transition: 'all 0.2s',
								backgroundColor: 'white'
							}}
							onFocus={(e) => {
								e.target.style.borderColor = '#3b82f6';
								e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
							}}
							onBlur={(e) => {
								e.target.style.borderColor = '#d1d5db';
								e.target.style.boxShadow = 'none';
							}}
						/>
					</div>

					<div style={{ marginBottom: '16px' }}>
						<label style={{ 
							display: 'block', 
							marginBottom: '6px',
							fontSize: '13px',
							fontWeight: '500',
							color: '#374151'
						}}>
							Email Address
						</label>
						<input
							type="email"
							required
							value={formData.email}
							onChange={(e) => setFormData({...formData, email: e.target.value})}
							style={{ 
								width: '100%', 
								padding: '10px 12px', 
								border: '1px solid #d1d5db', 
								borderRadius: '6px',
								fontSize: '14px',
								outline: 'none',
								transition: 'all 0.2s',
								backgroundColor: 'white'
							}}
							onFocus={(e) => {
								e.target.style.borderColor = '#3b82f6';
								e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
							}}
							onBlur={(e) => {
								e.target.style.borderColor = '#d1d5db';
								e.target.style.boxShadow = 'none';
							}}
						/>
					</div>

					<div style={{ marginBottom: '16px' }}>
						<label style={{ 
							display: 'block', 
							marginBottom: '6px',
							fontSize: '13px',
							fontWeight: '500',
							color: '#374151'
						}}>
							Class
						</label>
						<input
							value={formData.class}
							onChange={(e) => setFormData({...formData, class: e.target.value})}
							style={{ 
								width: '100%', 
								padding: '10px 12px', 
								border: '1px solid #d1d5db', 
								borderRadius: '6px',
								fontSize: '14px',
								outline: 'none',
								transition: 'all 0.2s',
								backgroundColor: 'white'
							}}
							onFocus={(e) => {
								e.target.style.borderColor = '#3b82f6';
								e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
							}}
							onBlur={(e) => {
								e.target.style.borderColor = '#d1d5db';
								e.target.style.boxShadow = 'none';
							}}
							placeholder="Enter class name"
						/>
					</div>

					<div style={{ marginBottom: '20px' }}>
						<label style={{ 
							display: 'block', 
							marginBottom: '6px',
							fontSize: '13px',
							fontWeight: '500',
							color: '#374151'
						}}>
							Status
						</label>
						<select
							value={formData.status}
							onChange={(e) => setFormData({...formData, status: e.target.value})}
							style={{ 
								width: '100%', 
								padding: '10px 12px', 
								border: '1px solid #d1d5db', 
								borderRadius: '6px',
								fontSize: '14px',
								outline: 'none',
								backgroundColor: 'white',
								cursor: 'pointer'
							}}
						>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
						</select>
					</div>

					{error && (
						<div style={{ 
							color: '#dc2626', 
							marginBottom: '16px',
							padding: '10px 12px',
							backgroundColor: '#fef2f2',
							border: '1px solid #fecaca',
							borderRadius: '6px',
							fontSize: '13px',
							display: 'flex',
							alignItems: 'center',
							gap: '6px'
						}}>
							<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
							</svg>
							{error}
						</div>
					)}

					<div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
						<button 
							type="button" 
							onClick={onClose}
							style={{ 
								padding: '10px 16px', 
								border: '1px solid #d1d5db', 
								borderRadius: '6px', 
								backgroundColor: 'white',
								color: '#64748b',
								fontSize: '14px',
								fontWeight: '500',
								cursor: 'pointer',
								transition: 'all 0.2s'
							}}
							onMouseOver={(e) => {
								e.target.style.backgroundColor = '#f8fafc';
								e.target.style.borderColor = '#9ca3af';
							}}
							onMouseOut={(e) => {
								e.target.style.backgroundColor = 'white';
								e.target.style.borderColor = '#d1d5db';
							}}
						>
							Cancel
						</button>
						<button 
							type="submit" 
							disabled={submitting}
							style={{ 
								padding: '10px 16px', 
								backgroundColor: submitting ? '#9ca3af' : '#3b82f6', 
								color: 'white', 
								border: 'none', 
								borderRadius: '6px',
								fontSize: '14px',
								fontWeight: '500',
								cursor: submitting ? 'not-allowed' : 'pointer',
								transition: 'background-color 0.2s',
								display: 'flex',
								alignItems: 'center',
								gap: '6px'
							}}
							onMouseOver={(e) => {
								if (!submitting) e.target.style.backgroundColor = '#2563eb';
							}}
							onMouseOut={(e) => {
								if (!submitting) e.target.style.backgroundColor = '#3b82f6';
							}}
						>
							{submitting && (
								<div style={{
									width: '14px',
									height: '14px',
									border: '2px solid transparent',
									borderTop: '2px solid white',
									borderRadius: '50%',
									animation: 'spin 1s linear infinite'
								}}></div>
							)}
							{submitting ? 'Updating...' : 'Update User'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
