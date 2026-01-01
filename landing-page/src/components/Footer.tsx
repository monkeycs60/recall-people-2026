import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-xl font-serif font-bold text-foreground">Recall People</h3>
            <p className="text-sm text-text-muted mt-2">© 2026 Recall People. Tous droits réservés.</p>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-text-secondary">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Support</a>
          </div>

          <div className="flex items-center text-sm text-text-muted">
            <span>Made with</span>
            <Heart className="w-4 h-4 mx-1 text-primary fill-current" />
            <span>in Paris</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
