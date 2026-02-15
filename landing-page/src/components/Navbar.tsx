'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Privacy', href: '/#privacy' },
  { label: 'Pricing', href: '/#pricing' },
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out border-b ${
        isScrolled || isOpen
          ? 'bg-background/80 backdrop-blur-xl border-border-light py-3'
          : 'bg-transparent border-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.svg"
              alt="Recall People"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-bold text-lg text-text-primary tracking-tight">
              Recall People
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-secondary hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link 
                href="#"
                className="bg-primary text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
            >
                Download
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 -mr-2 text-text-primary"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? 'max-h-64 opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="flex flex-col gap-2 pb-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="px-4 py-3 rounded-xl text-text-secondary hover:bg-surface-alt hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
             <Link
                href="#"
                onClick={() => setIsOpen(false)}
                className="px-4 py-3 rounded-xl text-primary font-bold bg-primary/5 mt-2"
              >
                Download App
              </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
