export default function StudentDashboard() {
	return (
		<div>
			<h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">My Courses</h2>
					<p className="text-sm text-gray-600 mb-3">Continue learning</p>
					<a href="/courses" className="text-blue-600 text-sm font-medium">View Courses →</a>
				</div>
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">Assessments</h2>
					<p className="text-sm text-gray-600 mb-3">Take quizzes and tests</p>
					<a href="/assessments" className="text-blue-600 text-sm font-medium">View →</a>
				</div>
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">Progress</h2>
					<p className="text-sm text-gray-600 mb-3">Track your learning</p>
					<a href="/progress" className="text-blue-600 text-sm font-medium">View Progress →</a>
				</div>
				<div className="bg-white border rounded p-4">
					<h2 className="font-semibold mb-2">AI Help</h2>
					<p className="text-sm text-gray-600">Get coding assistance</p>
				</div>
			</div>
		</div>
	);
}

