import Link from 'next/link';

export default function Home() {
  const features = [
    {
      title: "Start Chat",
      description: "Practice daily conversations with your AI tutor.",
      href: "/chat",
      icon: "💬",
      color: "bg-blue-600"
    },
    {
      title: "Upload PDF",
      description: "Learn from your own course materials and files.",
      href: "/pdf-learning",
      icon: "📄",
      color: "bg-green-600"
    },
    {
      title: "Chinese Culture",
      description: "Explore traditions, history, and cultural insights.",
      href: "/culture",
      icon: "🏮",
      color: "bg-red-600"
    },
    {
      title: "Trending Words",
      description: "Stay updated with the latest internet slang.",
      href: "/trending",
      icon: "🔥",
      color: "bg-purple-600"
    }
  ];

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-8 md:p-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="z-10 max-w-6xl w-full items-center justify-center font-mono text-sm flex flex-col text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight">
          Master Chinese with <span className="text-blue-600">AI</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Experience the future of language learning. Choose your path below.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full px-4">
            {features.map((feature) => (
              <Link 
                key={feature.title}
                href={feature.href}
                className="group relative flex flex-col items-center p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all hover:-translate-y-1 border border-slate-100"
              >
                <div className={`text-4xl mb-4 p-4 rounded-full ${feature.color} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
                  {feature.icon}
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{feature.title}</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
                <div className={`mt-6 ${feature.color} text-white px-6 py-2 rounded-full text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Go →
                </div>
              </Link>
            ))}
            
            <Link 
              href="/memory"
              className="group relative flex flex-col items-center p-8 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-md hover:shadow-xl transition-all hover:-translate-y-1 border border-orange-100 md:col-span-2 lg:col-span-4"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl p-4 rounded-full bg-orange-500 bg-opacity-10 group-hover:bg-opacity-20 transition-all">
                  🧠
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-slate-900">Memory Bank</h2>
                  <p className="text-slate-600 text-sm">Review vocabulary with Spaced Repetition</p>
                </div>
              </div>
              <div className="mt-2 bg-orange-500 text-white px-8 py-2 rounded-full text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Start Review Session →
              </div>
            </Link>
          </div>
        </div>
      </main>
    );
  }
