import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-foreground text-white py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
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
            <span className="text-gray-500">
              Made with &#9829; in Paris
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
