import React from 'react';
import TopBar from './components/TopBar.jsx';

export default function App() {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[100] overflow-hidden bg-transparent">
      {/* React UI goes here, gradually replacing vanilla HTML */}
      <TopBar />
    </div>
  );
}
