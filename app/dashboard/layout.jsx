// Dashboard layout is now handled by root layout
// This is a passthrough to avoid double nesting
export default function DashboardLayout({ children }) {
	return <>{children}</>;
}
