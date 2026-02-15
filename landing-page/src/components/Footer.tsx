import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="py-20 md:py-32 bg-text-primary text-text-inverse relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
          Stop forgetting. <br/>
          <span className="text-primary-light">Start connecting.</span>
        </h2>
        
        <p className="text-xl text-text-muted mb-10 max-w-xl mx-auto font-light">
          Your next conversation is worth remembering.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
           <Link
              href="#"
              className="bg-white text-text-primary hover:bg-gray-100 transition-colors px-8 py-4 rounded-full font-bold text-lg"
            >
              Download Recall People
            </Link>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between border-t border-white/10 pt-8 mt-8 text-sm text-text-muted">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
                <Image src="/logo.png" alt="Recall Logo" width={24} height={24} className="opacity-50 grayscale" unoptimized />
                <span>© {new Date().getFullYear()} Recall People</span>
            </div>
            
            <div className="flex gap-6">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                <Link href="mailto:hello@recall-people.com" className="hover:text-white transition-colors">Contact</Link>
            </div>
        </div>
      </div>
    </footer>
  );
}
