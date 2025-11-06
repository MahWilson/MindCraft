/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./app/**/*.{js,jsx,ts,tsx}',
		'./components/**/*.{js,jsx,ts,tsx}',
	],
	theme: {
		extend: {
			colors: {
				// MindCraft Design System Colors
				primary: '#4C60FF',
				secondary: '#FFC857',
				neutralDark: '#1A1C23',
				neutralLight: '#F7F8FA',
				success: '#4BB543',
				warning: '#FFB200',
				error: '#E63946',
				// shadcn/ui compatibility
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				card: '1rem', // rounded-xl equivalent
			},
			// 8px spacing grid system
			spacing: {
				'4': '4px',
				'8': '8px',
				'12': '12px',
				'16': '16px',
				'24': '24px',
				'32': '32px',
				'48': '48px',
				'64': '64px',
			},
			// Typography scale from design system
			fontSize: {
				'h1': ['32px', { lineHeight: '1.2', fontWeight: '600' }],
				'h2': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
				'h3': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
				'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
				'caption': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
			},
			// Motion principles: fast (120-200ms)
			transitionDuration: {
				'120': '120ms',
				'200': '200ms',
			},
			// Subtle animations
			scale: {
				'105': '1.05',
			},
		},
	},
	plugins: [],
};


