/**
 * Editor Page Component
 *
 * Main editor and simulator page
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { CodeEditor } from '../components/editor/CodeEditor';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { SimulatorCanvas } from '../components/simulator/SimulatorCanvas';
import '../App.css';

export const EditorPage: React.FC = () => {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Arduino Emulator</h1>
            <p>Local Arduino IDE & Simulator</p>
          </div>
          <Link to="/examples" className="examples-link">
            📚 Browse Examples
          </Link>
        </div>
      </header>
      <div className="app-container">
        <div className="editor-panel">
          <EditorToolbar />
          <div className="editor-wrapper">
            <CodeEditor />
          </div>
        </div>
        <div className="simulator-panel">
          <SimulatorCanvas />
        </div>
      </div>
    </div>
  );
};
