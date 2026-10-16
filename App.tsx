/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

// Custom useTypewriter hook:
// Takes text, speed (default 38ms), startDelay (default 600ms)
// After delay, reveals one character at a time. Returns { displayed, done }.
function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let index = 0;
    let timerId: ReturnType<typeof setInterval> | null = null;

    const delayTimeout = setTimeout(() => {
      timerId = setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) {
          setDone(true);
          if (timerId) clearInterval(timerId);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(delayTimeout);
      if (timerId) clearInterval(timerId);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const targetTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  const prevXRef = useRef<number | null>(null);

  // Mobile menu open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Background video source (Meta AI share video converted to playable MP4 stream)
  // Original share URL: https://www.meta.ai/share/m/JTkiK1sKU9
  const [videoSrc, setVideoSrc] = useState('/background.mp4');

  // Video presentation settings - tuned so character does NOT overlap text
  // Character is placed on the right side on desktop, and upper-center on mobile
  const [videoScale, setVideoScale] = useState(100);
  const [horizontalPosition, setHorizontalPosition] = useState<'right' | 'center' | 'far-right'>('right');
  const [isSizeBarOpen, setIsSizeBarOpen] = useState(false);

  // Pills appearance state (400ms after page load)
  const [pillsVisible, setPillsVisible] = useState(false);

  // Copied state indicator
  const [copied, setCopied] = useState(false);

  // Typewriter hook for hero message
  const heroText = 'Glad you stopped in. Good taste tends to find us. Now, what are we building?';
  const { displayed, done } = useTypewriter(heroText, 38, 600);

  // 1. Trigger pill buttons appearance 400ms after page load independent of typewriter
  useEffect(() => {
    const timer = setTimeout(() => {
      setPillsVisible(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // 2. Video mouse-scrubbing (and touch-scrubbing) logic
  useEffect(() => {
    const SENSITIVITY = 0.8;

    const handlePointerMove = (clientX: number) => {
      if (prevXRef.current === null) {
        prevXRef.current = clientX;
        return;
      }

      const delta = clientX - prevXRef.current;
      prevXRef.current = clientX;

      const video = videoRef.current;
      if (!video || !video.duration || Number.isNaN(video.duration)) {
        return;
      }

      const timeOffset = (delta / window.innerWidth) * SENSITIVITY * video.duration;
      targetTimeRef.current = Math.max(0, Math.min(video.duration, targetTimeRef.current + timeOffset));

      if (!isSeekingRef.current) {
        isSeekingRef.current = true;
        video.currentTime = targetTimeRef.current;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        prevXRef.current = e.touches[0].clientX;
      }
    };

    const onPointerReset = () => {
      prevXRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onPointerReset);
    window.addEventListener('blur', onPointerReset);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onPointerReset);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onPointerReset);
      window.removeEventListener('blur', onPointerReset);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerReset);
    };
  }, []);

  // Handle onSeeked on the video element to prevent seek-flooding
  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) return;

    if (Math.abs(video.currentTime - targetTimeRef.current) > 0.02) {
      video.currentTime = targetTimeRef.current;
    } else {
      isSeekingRef.current = false;
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      targetTimeRef.current = videoRef.current.currentTime || 0;
    }
  };

  // Copy email handler
  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText('hello@mainframe.co');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = 'hello@mainframe.co';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks = [
    { name: 'Labs', href: '#labs' },
    { name: 'Studio', href: '#studio' },
    { name: 'Openings', href: '#openings' },
    { name: 'Shop', href: '#shop' },
  ];

  // Resolve object position to place character safely away from text
  const getObjectPositionStyle = () => {
    if (horizontalPosition === 'far-right') {
      return '90% 45%';
    }
    if (horizontalPosition === 'center') {
      return '50% 35%';
    }
    // Default 'right': positions character around 82% X on desktop, 50% X and 20% Y on mobile
    return 'var(--video-pos, 82% 40%)';
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden select-none font-body text-white bg-black">
      {/* Dynamic CSS variable for responsive video alignment:
          On mobile: character is positioned high (center 20%) so bottom text does not overlap face.
          On md+: character is positioned on the right (82% 40%) so left text does not overlap character. */}
      <style>{`
        :root {
          --video-pos: 50% 22%;
        }
        @media (min-width: 768px) {
          :root {
            --video-pos: 82% 42%;
          }
        }
      `}</style>

      {/* BACKGROUND VIDEO (mouse-scrub controlled & offset to prevent text overlap) */}
      <div
        className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none transition-transform duration-300"
        style={{
          transform: `scale(${videoScale / 100})`,
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          onError={() => {
            if (videoSrc !== '/background.mp4') {
              setVideoSrc('/background.mp4');
            }
          }}
          muted
          playsInline
          preload="auto"
          onSeeked={handleSeeked}
          onLoadedMetadata={handleLoadedMetadata}
          aria-hidden="true"
          className="transition-all duration-300"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: getObjectPositionStyle(),
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Protective directional backdrop gradient:
          Subtle left-side shadow so white text has razor-sharp contrast against any light in the video,
          leaving the character on the right completely clear and vibrant. */}
      <div
        className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-r from-black/85 via-black/45 to-transparent md:w-3/4"
        aria-hidden="true"
      />
      {/* Mobile top-to-bottom soft vignette */}
      <div
        className="fixed inset-0 z-0 pointer-events-none md:hidden bg-gradient-to-t from-black/90 via-black/40 to-transparent"
        aria-hidden="true"
      />

      {/* NAVBAR (fixed, z-index: 10, all white text) */}
      <header
        className="fixed top-0 left-0 w-full z-10 px-5 sm:px-8 py-4 sm:py-5 flex row justify-between items-center"
      >
        {/* Logo (left) */}
        <a href="/" className="flex flex-row items-center gap-2.5 no-underline text-white group">
          <span
            style={{ fontFamily: 'var(--font-heading)' }}
            className="text-[17px] sm:text-[21px] tracking-tight text-white leading-none drop-shadow-sm"
          >
            Mainframe®
          </span>
          <span
            className="text-[20px] sm:text-[24px] text-white select-none leading-none inline-block transform translate-y-[-1px]"
            style={{ letterSpacing: '-0.02em' }}
            aria-hidden="true"
          >
            ✳︎
          </span>
        </a>

        {/* Desktop nav links (center, hidden below md) */}
        <nav className="hidden md:flex flex-row items-center text-[16px] sm:text-[18px] text-white/90">
          {navLinks.map((link, idx) => (
            <React.Fragment key={link.name}>
              <a
                href={link.href}
                className="text-white hover:opacity-60 transition-opacity duration-200"
              >
                {link.name}
              </a>
              {idx < navLinks.length - 1 && <span className="text-white/80">,&nbsp;</span>}
            </React.Fragment>
          ))}
        </nav>

        {/* Desktop CTA (right, hidden below md) */}
        <div className="hidden md:block">
          <a
            href="mailto:hello@mainframe.co"
            className="text-[16px] sm:text-[18px] text-white underline underline-offset-2 hover:opacity-60 transition-opacity duration-200"
          >
            Get in touch
          </a>
        </div>

        {/* Mobile hamburger (visible below md, white bars) */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className="md:hidden flex flex-col justify-center items-center gap-[5px] p-2 focus:outline-none cursor-pointer"
          aria-label="Toggle Menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span
            className={`w-6 h-[2px] bg-white block transition-all duration-300 origin-center ${
              isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-white block transition-opacity duration-300 ${
              isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <span
            className={`w-6 h-[2px] bg-white block transition-all duration-300 origin-center ${
              isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''
            }`}
          />
        </button>
      </header>

      {/* MOBILE OVERLAY (z-index: 9, dark glass with white text) */}
      <div
        className={`fixed inset-0 z-[9] bg-black/95 backdrop-blur-md md:hidden flex flex-col justify-center px-8 gap-8 transition-opacity duration-300 ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-6">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-[32px] font-medium text-white hover:opacity-60 transition-opacity"
            >
              {link.name}
            </a>
          ))}
          <a
            href="mailto:hello@mainframe.co"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-[32px] font-medium text-white underline underline-offset-4 hover:opacity-60 transition-opacity mt-2"
          >
            Get in touch
          </a>
        </div>
      </div>

      {/* HERO SECTION (z-index: 1, constrained width on left so character on right has full clear view) */}
      <main className="relative z-[1] h-screen w-full flex flex-col justify-end pb-12 md:justify-center md:pb-0 px-5 sm:px-8 md:px-12 lg:px-16 overflow-hidden">
        <div className="max-w-md lg:max-w-lg relative z-10">
          {/* 1. Blurred intro label - Compact WHITE text */}
          <div
            className="pointer-events-none select-none mb-3 sm:mb-4"
            style={{
              fontSize: 'clamp(13px, 1.8vw, 16px)',
              lineHeight: 1.35,
              fontWeight: 400,
              color: '#ffffff',
              filter: 'blur(3px)',
            }}
          >
            Hey there, meet A.R.I.A,
            <br />
            Mainframe's Adaptive Response Interface Agent
          </div>

          {/* 2. Typewriter text - Compact WHITE text */}
          <p
            className="text-white mb-4 sm:mb-5 drop-shadow-sm font-normal"
            style={{
              fontSize: 'clamp(14px, 2.1vw, 18px)',
              lineHeight: 1.4,
              minHeight: '44px',
            }}
          >
            {displayed}
            {!done && (
              <span
                className="inline-block w-[2px] h-[1em] bg-white align-middle ml-[2px] animate-cursor-blink"
                aria-hidden="true"
              />
            )}
          </p>

          {/* 3. Action pill buttons - Compact WHITE text */}
          <div
            className="flex flex-wrap gap-y-1"
            style={{
              opacity: pillsVisible ? 1 : 0,
              transform: pillsVisible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {/* 4 pills with white text on refined glass pills that invert on hover */}
            <button
              type="button"
              className="inline-flex items-center justify-center bg-white/10 text-white border border-white/25 rounded-full text-[11px] sm:text-[13px] px-3.5 sm:px-4 py-[0.28em] mx-[0.15em] mb-[0.35em] whitespace-nowrap cursor-pointer hover:bg-white hover:text-black transition-colors duration-200 backdrop-blur-sm"
            >
              Pitch us an idea
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center bg-white/10 text-white border border-white/25 rounded-full text-[11px] sm:text-[13px] px-3.5 sm:px-4 py-[0.28em] mx-[0.15em] mb-[0.35em] whitespace-nowrap cursor-pointer hover:bg-white hover:text-black transition-colors duration-200 backdrop-blur-sm"
            >
              Come work here
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center bg-white/10 text-white border border-white/25 rounded-full text-[11px] sm:text-[13px] px-3.5 sm:px-4 py-[0.28em] mx-[0.15em] mb-[0.35em] whitespace-nowrap cursor-pointer hover:bg-white hover:text-black transition-colors duration-200 backdrop-blur-sm"
            >
              Send a brief hello
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center bg-white/10 text-white border border-white/25 rounded-full text-[11px] sm:text-[13px] px-3.5 sm:px-4 py-[0.28em] mx-[0.15em] mb-[0.35em] whitespace-nowrap cursor-pointer hover:bg-white hover:text-black transition-colors duration-200 backdrop-blur-sm"
            >
              See how we operate
            </button>

            {/* 1 outline pill button with copy action - Compact WHITE text */}
            <button
              type="button"
              onClick={handleCopyEmail}
              title="Click to copy email address"
              className="inline-flex items-center justify-center text-white bg-transparent border border-white/70 rounded-full text-[11px] sm:text-[13px] px-3.5 sm:px-4 py-[0.28em] mx-[0.15em] mb-[0.35em] whitespace-nowrap cursor-pointer gap-2 hover:bg-white hover:text-black transition-colors duration-200 group"
            >
              <span>
                Reach us:{' '}
                <span className="underline underline-offset-1">
                  hello@mainframe.co
                </span>
              </span>

              {/* 11x11 copy icon */}
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0 transition-transform group-hover:scale-110"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="1"
                  width="7.5"
                  height="7.5"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.1"
                />
                <rect
                  x="3.5"
                  y="3.5"
                  width="7.5"
                  height="7.5"
                  rx="1"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="1.1"
                />
              </svg>

              {copied && (
                <span className="text-[11px] uppercase tracking-wider font-mono ml-1 text-emerald-400">
                  Copied!
                </span>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* QUICK POSITION & SIZE CONTROLLER (optional subtle pill in bottom-right) */}
      <aside
        aria-label="Framing Controls"
        className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-2"
      >
        {isSizeBarOpen ? (
          <div className="bg-black/85 backdrop-blur-md text-white border border-white/20 shadow-2xl rounded-2xl p-3 flex flex-col gap-2.5 text-xs animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-1.5 font-medium">
              <span className="tracking-tight uppercase text-[10px] text-white/60">Character Framing</span>
              <button
                type="button"
                onClick={() => setIsSizeBarOpen(false)}
                className="hover:opacity-60 px-1 py-0.5 rounded text-white font-semibold cursor-pointer"
                title="Collapse controls"
              >
                ✕
              </button>
            </div>

            {/* Character Placement */}
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-white/70">Character Position:</span>
              <div className="flex gap-1">
                {(['right', 'far-right', 'center'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setHorizontalPosition(pos)}
                    className={`capitalize px-2 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                      horizontalPosition === pos
                        ? 'bg-white text-black font-semibold'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {pos === 'right' ? 'Optimal' : pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Scale Slider */}
            <div className="flex items-center justify-between text-[11px] gap-2 pt-1 border-t border-white/10">
              <span className="text-white/70">Scale: {videoScale}%</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVideoScale((prev) => Math.max(60, prev - 5))}
                  className="w-5 h-5 flex items-center justify-center rounded-full border border-white/30 hover:bg-white hover:text-black transition-colors cursor-pointer text-xs"
                >
                  −
                </button>
                <input
                  type="range"
                  min="60"
                  max="140"
                  step="5"
                  value={videoScale}
                  onChange={(e) => setVideoScale(Number(e.target.value))}
                  className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <button
                  type="button"
                  onClick={() => setVideoScale((prev) => Math.min(140, prev + 5))}
                  className="w-5 h-5 flex items-center justify-center rounded-full border border-white/30 hover:bg-white hover:text-black transition-colors cursor-pointer text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsSizeBarOpen(true)}
            className="bg-black/60 hover:bg-black/90 backdrop-blur-md text-white border border-white/20 shadow-md rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Framing: {horizontalPosition === 'right' ? 'Optimal' : horizontalPosition}</span>
          </button>
        )}
      </aside>
    </div>
  );
}
