'use client';

import { useState } from 'react';

export default function Sidebar({ currentPage = 'users', onToggle }) {
	const [isMinimized, setIsMinimized] = useState(false);

	const handleToggle = () => {
		const newState = !isMinimized;
		setIsMinimized(newState);
		if (onToggle) {
			onToggle(newState);
		}
	};

	const menuItems = [
		{ id: 'dashboard', label: 'Dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z', href: '/dashboard' },
		{ id: 'users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z', href: '/dashboard/users' },
		{ id: 'courses', label: 'Courses', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', href: '/dashboard/courses' },
		{ id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', href: '/dashboard/analytics' },
		{ id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', href: '/dashboard/settings' }
	];

	return (
		<div style={{
			position: 'fixed',
			left: 0,
			top: 0,
			width: isMinimized ? '80px' : '280px',
			height: '100vh',
			backgroundColor: '#0f172a',
			transition: 'width 0.3s ease-in-out',
			zIndex: 1000,
			borderRight: '1px solid #1e293b'
		}}>
			{/* Header */}
			<div style={{ 
				padding: isMinimized ? '24px 16px' : '24px', 
				borderBottom: '1px solid #1e293b',
				display: 'flex',
				alignItems: 'center',
				justifyContent: isMinimized ? 'center' : 'space-between'
			}}>
				{!isMinimized && (
					<div style={{
						display: 'flex',
						alignItems: 'center',
						gap: '12px',
						color: 'white',
						fontSize: '20px',
						fontWeight: '700'
					}}>
						<div style={{
							width: '32px',
							height: '32px',
							backgroundColor: '#3b82f6',
							borderRadius: '8px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: '16px',
							fontWeight: '700'
						}}>
							M
						</div>
						MindCraft
					</div>
				)}
				
				{isMinimized && (
					<div style={{
						width: '32px',
						height: '32px',
						backgroundColor: '#3b82f6',
						borderRadius: '8px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: '16px',
						fontWeight: '700',
						color: 'white'
					}}>
						M
					</div>
				)}

				<button
					onClick={handleToggle}
					style={{
						background: 'none',
						border: 'none',
						color: '#94a3b8',
						cursor: 'pointer',
						padding: '4px',
						borderRadius: '4px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						transition: 'color 0.2s'
					}}
					onMouseOver={(e) => e.target.style.color = 'white'}
					onMouseOut={(e) => e.target.style.color = '#94a3b8'}
				>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<path d={isMinimized ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
					</svg>
				</button>
			</div>

			{/* Navigation */}
			<nav style={{ padding: '24px 16px' }}>
				{menuItems.map((item) => (
					<a
						key={item.id}
						href={item.href}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: isMinimized ? '0' : '12px',
							padding: isMinimized ? '12px 8px' : '12px 16px',
							marginBottom: '4px',
							borderRadius: '8px',
							textDecoration: 'none',
							fontSize: '14px',
							fontWeight: '500',
							color: currentPage === item.id ? '#3b82f6' : '#94a3b8',
							backgroundColor: currentPage === item.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
							transition: 'all 0.2s',
							justifyContent: isMinimized ? 'center' : 'flex-start',
							position: 'relative'
						}}
						onMouseOver={(e) => {
							if (currentPage !== item.id) {
								e.target.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
								e.target.style.color = 'white';
							}
						}}
						onMouseOut={(e) => {
							if (currentPage !== item.id) {
								e.target.style.backgroundColor = 'transparent';
								e.target.style.color = '#94a3b8';
							}
						}}
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d={item.icon} />
						</svg>
						{!isMinimized && <span>{item.label}</span>}
						
						{/* Tooltip for minimized state */}
						{isMinimized && (
							<div style={{
								position: 'absolute',
								left: '100%',
								top: '50%',
								transform: 'translateY(-50%)',
								marginLeft: '12px',
								padding: '8px 12px',
								backgroundColor: '#1e293b',
								color: 'white',
								fontSize: '12px',
								borderRadius: '6px',
								whiteSpace: 'nowrap',
								opacity: 0,
								pointerEvents: 'none',
								transition: 'opacity 0.2s',
								zIndex: 1001,
								boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
							}}
							className="tooltip"
						>
							{item.label}
							<div style={{
								position: 'absolute',
								left: '-4px',
								top: '50%',
								transform: 'translateY(-50%)',
								width: 0,
								height: 0,
								borderTop: '4px solid transparent',
								borderBottom: '4px solid transparent',
								borderRight: '4px solid #1e293b'
							}} />
						</div>
						)}
					</a>
				))}
			</nav>

			{/* User Profile Section */}
			<div style={{
				position: 'absolute',
				bottom: '24px',
				left: '16px',
				right: '16px',
				padding: isMinimized ? '12px 8px' : '12px 16px',
				backgroundColor: '#1e293b',
				borderRadius: '8px',
				display: 'flex',
				alignItems: 'center',
				gap: isMinimized ? '0' : '12px',
				justifyContent: isMinimized ? 'center' : 'flex-start'
			}}>
				<div style={{
					width: '32px',
					height: '32px',
					backgroundColor: '#3b82f6',
					borderRadius: '50%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'white',
					fontSize: '14px',
					fontWeight: '600'
				}}>
					A
				</div>
				{!isMinimized && (
					<div>
						<div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
							Admin User
						</div>
						<div style={{ color: '#94a3b8', fontSize: '12px' }}>
							admin@mindcraft.com
						</div>
					</div>
				)}
			</div>

			{/* CSS for tooltip hover effect */}
			<style jsx>{`
				a:hover .tooltip {
					opacity: 1 !important;
				}
			`}</style>
		</div>
	);
}
