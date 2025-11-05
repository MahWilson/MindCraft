export default function AdminDashboard() {
	return (
		<div>
			<h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">User Management</h2>
					<p className="text-sm text-gray-600 mb-3">Register teachers and students</p>
					<a href="/admin/register" className="text-blue-600 text-sm font-medium">Go to Register →</a>
				</div>
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">Courses</h2>
					<p className="text-sm text-gray-600 mb-3">Approve and manage courses</p>
					<a href="/courses" className="text-blue-600 text-sm font-medium">View Courses →</a>
				</div>
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">System Overview</h2>
					<p className="text-sm text-gray-600">Monitor platform activity</p>
				</div>
			</div>
		</div>
	);
}

