import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

export default function Navbar() {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);

  // Transform values for scroll
  const navWidth = useTransform(scrollY, [0, 100], ["100%", "90%"]);
  const navY = useTransform(scrollY, [0, 100], ["0px", "16px"]);
  const navBorderRadius = useTransform(scrollY, [0, 100], ["0px", "40px"]);
  const navPadding = useTransform(scrollY, [0, 100], ["24px", "16px"]);
  const navBackground = useTransform(
    scrollY,
    [0, 100],
    ["rgba(247, 243, 234, 0)", "rgba(247, 243, 234, 0.75)"]
  );
  const navShadow = useTransform(
    scrollY,
    [0, 100],
    [
      "0px 0px 0px rgba(0, 0, 0, 0)",
      "0px 4px 20px rgba(45, 39, 35, 0.08)"
    ]
  );
  const navBorder = useTransform(
    scrollY,
    [0, 100],
    [
      "1px solid rgba(176, 141, 106, 0)",
      "1px solid rgba(176, 141, 106, 0.2)"
    ]
  );

  return (
    <div className="fixed top-0 left-0 w-full z-50 flex justify-center pointer-events-none">
      <motion.nav
        style={{
          width: navWidth,
          y: navY,
          borderRadius: navBorderRadius,
          paddingTop: navPadding,
          paddingBottom: navPadding,
          backgroundColor: navBackground,
          boxShadow: navShadow,
          border: navBorder,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        className="pointer-events-auto px-6 md:px-12 flex justify-between items-center transition-colors duration-300 max-w-7xl"
      >
        <h1 className="text-2xl md:text-3xl font-display tracking-widest text-cafe-brown">SHIMO</h1>
        <ul className="hidden md:flex gap-10 text-[11px] uppercase tracking-[0.15em] font-medium text-cafe-brown">
          <li className="cursor-pointer transition-opacity duration-300 hover:opacity-60">Home</li>
          <li className="cursor-pointer transition-opacity duration-300 hover:opacity-60">Menu</li>
          <li className="cursor-pointer transition-opacity duration-300 hover:opacity-60">Shop</li>
          <li className="cursor-pointer transition-opacity duration-300 hover:opacity-60">Reviews</li>
          <li className="cursor-pointer transition-opacity duration-300 hover:opacity-60 font-semibold border-b border-cafe-brown/0 hover:border-cafe-brown/100">Order</li>
        </ul>
      </motion.nav>
    </div>
  );
}
