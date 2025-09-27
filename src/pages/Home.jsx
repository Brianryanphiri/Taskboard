import React from 'react';
import Taskboard from '../components/taskboard';

function Home() {
  console.log('Home component rendered');
  return (
    <div>
      <Taskboard />
    </div>
  );
}

export default Home;
