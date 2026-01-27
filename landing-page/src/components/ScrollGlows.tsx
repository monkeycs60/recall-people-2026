'use client';

import { useScroll, useTransform, motion } from 'framer-motion';

export default function ScrollGlows() {
  const { scrollYProgress } = useScroll();

  // Violet glow: starts at top (5%), moves down to 65% as you scroll
  const violetY = useTransform(scrollYProgress, [0, 1], ['5%', '65%']);

  // Amber glow: starts visible (15% from bottom), moves up to 75% from bottom as you scroll
  const amberBottom = useTransform(scrollYProgress, [0, 1], ['15%', '75%']);

  // Small violet accent: moves down slightly
  const violetAccentY = useTransform(scrollYProgress, [0, 1], ['20%', '50%']);

  // Small amber accent: moves up (using bottom positioning)
  const amberAccentBottom = useTransform(scrollYProgress, [0, 1], ['25%', '70%']);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] hidden md:block overflow-hidden">
      {/* Large violet glow - moves down on scroll */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full glow-violet opacity-40"
        style={{
          left: '-15%',
          top: violetY,
          translateY: '-50%',
        }}
      />

      {/* Amber glow - moves UP on scroll (using bottom positioning) */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full glow-amber opacity-35"
        style={{
          right: '-10%',
          bottom: amberBottom,
          translateY: '50%',
        }}
      />

      {/* Small violet accent - right side, moves down */}
      <motion.div
        className="absolute w-[250px] h-[250px] rounded-full glow-violet-soft opacity-50"
        style={{
          right: '10%',
          top: violetAccentY,
          translateY: '-50%',
        }}
      />

      {/* Small amber accent - left side, moves up */}
      <motion.div
        className="absolute w-[200px] h-[200px] rounded-full glow-amber-soft opacity-40"
        style={{
          left: '5%',
          bottom: amberAccentBottom,
          translateY: '50%',
        }}
      />
    </div>
  );
}
