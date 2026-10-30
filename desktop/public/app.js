// NexaStrike Desktop App Entry Point
// Uses React 18 from CDN with Babel Standalone for JSX compilation

const { useState, useEffect } = React;
const { createRoot } = ReactDOM;

// Simple App Component
function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize app
    try {
      console.log('App initialized');
      setIsReady(true);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  if (error) {
    return React.createElement('div', { style: { padding: '20px', color: '#ff6b6b' } },
      React.createElement('h1', null, 'Error'),
      React.createElement('p', null, error)
    );
  }

  if (!isReady) {
    return React.createElement('div', { style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '24px' } },
      'Loading...'
    );
  }

  return React.createElement('div', { style: { padding: '20px' } },
    React.createElement('h1', null, 'NexaStrike Desktop'),
    React.createElement('p', null, 'App is running with Electron ', electron?.version || 'unknown')
  );
}

// Render app
const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));
