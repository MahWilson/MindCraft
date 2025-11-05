import Link from 'next/link';

export default function LandingPage() {
	return (
		<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
			<div className="max-w-2xl mx-auto text-center px-4">
				<h1 className="text-5xl font-bold text-gray-900 mb-4">MindCraft</h1>
				<p className="text-xl text-gray-600 mb-8">AI-assisted learning platform for programming education</p>
				<div className="flex gap-4 justify-center">
					<Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
						Sign In
					</Link>
					<Link href="/explore" className="px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-semibold hover:bg-blue-50">
						Explore
					</Link>
				</div>
				<div className="mt-12 grid md:grid-cols-3 gap-6 text-left">
					<div className="bg-white p-4 rounded-lg shadow-sm">
						<h3 className="font-semibold mb-2">📚 Interactive Courses</h3>
						<p className="text-sm text-gray-600">Learn programming with hands-on lessons and exercises</p>
					</div>
					<div className="bg-white p-4 rounded-lg shadow-sm">
						<h3 className="font-semibold mb-2">🤖 AI Assistance</h3>
						<p className="text-sm text-gray-600">Get instant help with coding questions and concepts</p>
					</div>
					<div className="bg-white p-4 rounded-lg shadow-sm">
						<h3 className="font-semibold mb-2">📊 Track Progress</h3>
						<p className="text-sm text-gray-600">Monitor your learning journey and achievements</p>
					</div>
				</div>
			</div>
		</div>
	);
}

