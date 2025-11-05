export default function TeacherDashboard() {
	return (
		<div>
			<h1 className="text-2xl font-bold mb-4">Teacher Dashboard</h1>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">Create Course</h2>
					<p className="text-sm text-gray-600 mb-3">Start building a new course</p>
					<a href="/dashboard/courses/new" className="text-blue-600 text-sm font-medium">Create →</a>
				</div>
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">My Courses</h2>
					<p className="text-sm text-gray-600 mb-3">Manage your courses</p>
					<a href="/courses" className="text-blue-600 text-sm font-medium">View All →</a>
				</div>
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">Grade Assignments</h2>
					<p className="text-sm text-gray-600 mb-3">Review student submissions</p>
					<a href="/assignments" className="text-blue-600 text-sm font-medium">Grade →</a>
				</div>
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">AI Assist</h2>
					<p className="text-sm text-gray-600">Generate lesson content</p>
				</div>
			</div>
		</div>
	);
}

