import React from 'react';
import Navbar from './components/Navbar';
import CappuccinoExperience from './components/CappuccinoExperience';

function App() {
  return (
    <div className="w-full min-h-screen bg-cafe-cream">
      <Navbar />
      <main>
        <CappuccinoExperience />
        {/* Temporary next-section placeholder */}
        <section className="w-full h-screen flex items-center justify-center bg-[#F4EFE6]">
          <div className="text-center">
            <h2 className="text-3xl font-light mb-4">Our Story</h2>
            <p className="opacity-70 max-w-md mx-auto">This section will continue normal page scrolling after the Cappuccino experience.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
