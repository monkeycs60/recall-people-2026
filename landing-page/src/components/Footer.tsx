import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-foreground text-white py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Top section with CTA */}
          <div className="text-center pb-12 border-b border-white/10">
            <h2 className="text-2xl md:text-3xl font-bold font-serif mb-4">
              Ready to remember everyone?
            </h2>
            <p className="text-white/70 mb-8 max-w-md mx-auto">
              Download Recall and never forget a conversation again.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="#"
                className="transition-transform hover:scale-105"
                aria-label="Download on the App Store"
              >
                <Image
                  src="/images/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={140}
                  height={47}
                  className="h-12 w-auto"
                />
              </Link>
              <Link
                href="#"
                className="transition-transform hover:scale-105"
                aria-label="Get it on Google Play"
              >
                <Image
                  src="/images/google-play-badge.svg"
                  alt="Get it on Google Play"
                  width={158}
                  height={47}
                  className="h-12 w-auto"
                />
              </Link>
            </div>
          </div>

          {/* Bottom section */}
          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-serif font-bold">Recall</h3>
              <p className="text-sm text-white/50 mt-1">
                &copy; 2026 Recall People. All rights reserved.
              </p>
            </div>

            <div className="flex items-center space-x-6 text-sm text-white/70">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <a href="mailto:support@recall-people.com" className="hover:text-white transition-colors">
                Support
              </a>
            </div>

            <div className="flex items-center text-sm text-white/50">
              <span>Made with</span>
              <Heart className="w-4 h-4 mx-1 text-primary fill-current" />
              <span>in Paris</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
