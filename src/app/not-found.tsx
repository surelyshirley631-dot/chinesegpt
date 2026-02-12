import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <h2 className="text-3xl font-bold text-slate-800 mb-4">Page Not Found</h2>
      <p className="text-slate-600 mb-8">Could not find requested resource</p>
      <Link 
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
