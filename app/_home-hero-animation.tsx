"use client";

import { motion } from "motion/react";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function HomeHeroLeft({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.1 }}
      className="space-y-6"
    >
      {children}
    </motion.div>
  );
}

export function HomeHeroItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className={className}>
      {children}
    </motion.div>
  );
}

export function HomeHeroRight({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.55, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative flex justify-center md:justify-end"
    >
      {children}
    </motion.div>
  );
}

export function HomeMeetingCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="absolute bottom-4 left-0 md:-left-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/60 p-4 w-54 z-30"
    >
      {children}
    </motion.div>
  );
}

export function HomeSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
