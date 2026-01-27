'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Privacy', href: '/privacy' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out overflow-hidden ${
        isScrolled || isOpen
          ? 'bg-background/95 backdrop-blur-lg shadow-[0_2px_20px_-2px_rgba(0,0,0,0.08)] py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-0 group">
            <div className={`transition-all duration-500 ${isScrolled ? 'w-9 h-9' : 'w-10 h-10'}`}>
              <Image
                src="/logo.png"
                alt="Recall People"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <span className={`font-bold text-text-primary transition-all duration-500 -ml-0.5 ${
              isScrolled ? 'text-lg' : 'text-xl'
            }`}>
              ecall People
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isScrolled
                    ? 'text-text-secondary hover:text-primary hover:bg-primary-light/50'
                    : 'text-text-primary/80 hover:text-primary hover:bg-white/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2 rounded-xl transition-all duration-200 ${
              isScrolled
                ? 'hover:bg-surface-alt'
                : 'hover:bg-white/50'
            }`}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-5 h-5 text-text-primary" />
            ) : (
              <Menu className="w-5 h-5 text-text-primary" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
            isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="max-w-6xl mx-auto py-4 border-t border-border-light mt-2">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-primary hover:bg-primary-light/50 transition-all duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
