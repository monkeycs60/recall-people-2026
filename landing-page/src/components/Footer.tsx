import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-foreground text-white py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Top section with CTA */}
          <div className="text-center pb-12 border-b border-white/10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to remember everyone?
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Download Recall People and never forget a conversation again.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="#"
                className="transition-transform duration-200 hover:scale-105"
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
                className="transition-transform duration-200 hover:scale-105"
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
              <h3 className="text-xl font-bold text-white">Recall People</h3>
              <p className="text-sm text-gray-500 mt-1">
                &copy; 2026 Recall People. All rights reserved.
              </p>
            </div>

            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-primary transition-colors duration-200">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors duration-200">
                Terms
              </Link>
              <a href="mailto:support@recall-people.com" className="hover:text-primary transition-colors duration-200">
                Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
