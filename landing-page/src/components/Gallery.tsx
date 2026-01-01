import Image from 'next/image';

const screenshots = [
  { src: 'contacts-list.png', alt: 'Contact List' },
  { src: 'contact-id-1.png', alt: 'Contact Details' },
  { src: 'contacts-ia-search.png', alt: 'AI Search' },
  { src: 'guided-tour-2.png', alt: 'Onboarding' },
];

export default function Gallery() {
  return (
    <section className="py-24 overflow-hidden bg-surface">
      <div className="container mx-auto px-4 mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4">Interface in Detail</h2>
        <p className="text-text-secondary">Designed to be simple, elegant, and efficient.</p>
      </div>

      <div className="flex overflow-x-auto pb-8 gap-8 px-4 md:justify-center no-scrollbar items-start">
        {screenshots.map((shot, index) => (
          <div 
            key={index} 
            className="flex-none w-[280px] md:w-[320px] rounded-[2.5rem] border-4 border-white shadow-xl overflow-hidden transition-transform hover:scale-105 duration-300"
          >
            <Image
              src={`/images/screenshots/${shot.src}`}
              alt={shot.alt}
              width={1170}
              height={2532}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
