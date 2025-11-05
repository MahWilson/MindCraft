export default function DashboardPage() {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<div className="bg-white border rounded p-4">
				<h2 className="font-semibold mb-2">Quick Actions</h2>
				<ul className="list-disc ml-5 text-sm">
					<li><a className="text-blue-600" href="/dashboard/courses/new">Create Course</a></li>
					<li><a className="text-blue-600" href="/courses">View Courses</a></li>
				</ul>
			</div>
			<div className="bg-white border rounded p-4">
				<h2 className="font-semibold mb-2">Activity</h2>
				<p className="text-sm text-gray-600">No recent activity.</p>
			</div>
		</div>
	);
}


