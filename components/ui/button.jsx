import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'bg-primary text-white hover:opacity-90',
				secondary: 'bg-secondary text-neutralDark hover:opacity-90',
				destructive: 'bg-error text-white hover:opacity-90',
				outline: 'border border-neutralDark bg-transparent hover:bg-neutralLight',
				ghost: 'hover:bg-neutralLight',
			},
			size: {
				default: 'h-10 px-5 py-2',
				sm: 'h-9 px-3',
				lg: 'h-11 px-8',
				icon: 'h-10 w-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
	return (
		<button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
	);
});
Button.displayName = 'Button';

export { Button, buttonVariants };

