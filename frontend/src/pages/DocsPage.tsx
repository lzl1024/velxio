import React from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';

const GITHUB_URL = 'https://github.com/davidmonterocrespo24/velxio';
const DISCORD_URL = 'https://discord.gg/rCScB9cG';

interface DocSection {
  title: string;
  items: { label: string; href: string; desc: string }[];
}

const sections: DocSection[] = [
  {
    title: 'Getting Started',
    items: [
      { label: 'README', href: `${GITHUB_URL}#readme`, desc: 'Project overview, features, and setup instructions.' },
      { label: 'Self-Hosting with Docker', href: `${GITHUB_URL}#self-hosting`, desc: 'Run Velxio locally with a single Docker command.' },
      { label: 'Manual Setup', href: `${GITHUB_URL}#option-c-manual-setup`, desc: 'Set up the frontend and backend manually for development.' },
    ],
  },
  {
    title: 'Architecture',
    items: [
      { label: 'Architecture Overview', href: `${GITHUB_URL}/blob/master/doc/ARCHITECTURE.md`, desc: 'High-level data flow, component system, and simulation loop.' },
      { label: 'AVR8 Simulation', href: `${GITHUB_URL}#avr8-simulation-arduino-uno--nano--mega`, desc: 'How the ATmega328p emulation works at 16 MHz.' },
      { label: 'RP2040 Simulation', href: `${GITHUB_URL}#rp2040-simulation-raspberry-pi-pico`, desc: 'Raspberry Pi Pico emulation via rp2040js.' },
    ],
  },
  {
    title: 'Using the Editor',
    items: [
      { label: 'Writing Sketches', href: `${GITHUB_URL}#code-editing`, desc: 'Monaco editor features — autocomplete, multi-file, minimap.' },
      { label: 'Supported Boards', href: `${GITHUB_URL}#multi-board-support`, desc: 'Arduino Uno, Nano, Mega, and Raspberry Pi Pico.' },
      { label: 'Serial Monitor', href: `${GITHUB_URL}#serial-monitor`, desc: 'Live TX/RX output with auto baud-rate detection.' },
      { label: 'Library Manager', href: `${GITHUB_URL}#library-manager`, desc: 'Browse and install the full Arduino library index.' },
    ],
  },
  {
    title: 'Components & Wiring',
    items: [
      { label: 'Component System', href: `${GITHUB_URL}#component-system-48-components`, desc: '48+ electronic components — LEDs, displays, sensors, and more.' },
      { label: 'Wire System', href: `${GITHUB_URL}#wire-system`, desc: 'Orthogonal routing, segment editing, and signal-type colors.' },
    ],
  },
  {
    title: 'Contributing',
    items: [
      { label: 'Contributing Guide', href: `${GITHUB_URL}#contributing`, desc: 'Bug reports, pull requests, and CLA information.' },
      { label: 'Open Issues', href: `${GITHUB_URL}/issues`, desc: 'Browse open issues and feature requests on GitHub.' },
      { label: 'Discord Community', href: DISCORD_URL, desc: 'Ask questions and share projects with the community.' },
    ],
  },
];

const IcoExternal = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

export const DocsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#1e1e1e', color: '#d4d4d4' }}>
      <AppHeader />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px', width: '100%' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#e0e0e0', marginBottom: 6 }}>Documentation</h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 48 }}>
          Resources and guides for using and extending Velxio. Full documentation lives on{' '}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#007acc' }}>GitHub</a>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {sections.map((section) => (
            <section key={section.title}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: '#007acc', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                {section.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.items.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '10px 14px', borderRadius: 6, background: '#252526', textDecoration: 'none', transition: 'background 0.15s', border: '1px solid #333' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2d2e')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#252526')}
                  >
                    <span style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.label} <IcoExternal />
                    </span>
                    <span style={{ color: '#888', fontSize: 12, flexShrink: 1 }}>{item.desc}</span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div style={{ marginTop: 56, padding: '20px 24px', background: '#252526', borderRadius: 8, border: '1px solid #333', display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007acc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
            Something missing? Open an <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" style={{ color: '#007acc' }}>issue on GitHub</a> or ask in the{' '}
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#7289da' }}>Discord</a>.
          </p>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/editor" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: '#007acc', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Open Editor →
          </Link>
        </div>
      </main>
    </div>
  );
};
