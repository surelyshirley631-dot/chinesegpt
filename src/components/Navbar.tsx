import Link from 'next/link';
import AuthButton from './AuthButton';
import DataBackup from './DataBackup';

export default function Navbar() {
  return (
    <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-blue-600 tracking-tight">
              ChineseGPT
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-6">
              <Link
                href="/chat"
                className="text-slate-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Practice
              </Link>
              <Link
                href="/memory"
                className="text-slate-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Memory Bank
              </Link>
              <DataBackup />
              <div className="h-6 w-px bg-slate-200 mx-2"></div>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
