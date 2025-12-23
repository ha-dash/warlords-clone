/**
 * Test setup file for Jest
 * Sets up DOM environment and global test utilities
 */

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
};

// Mock localStorage
const localStorageMock = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};
global.localStorage = localStorageMock;

// Mock alert and other browser APIs
global.alert = () => {};

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = function(contextType) {
  if (contextType === '2d') {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      
      // Drawing methods
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: () => ({ width: 0 }),
      
      // Path methods
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      arcTo: () => {},
      quadraticCurveTo: () => {},
      bezierCurveTo: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      clip: () => {},
      
      // Transform methods
      save: () => {},
      restore: () => {},
      scale: () => {},
      rotate: () => {},
      translate: () => {},
      transform: () => {},
      setTransform: () => {},
      resetTransform: () => {},
      
      // Image methods
      drawImage: () => {},
      createImageData: () => ({ data: [], width: 0, height: 0 }),
      getImageData: () => ({ data: [], width: 0, height: 0 }),
      putImageData: () => {},
      
      // Gradient and pattern methods
      createLinearGradient: () => ({
        addColorStop: () => {}
      }),
      createRadialGradient: () => ({
        addColorStop: () => {}
      }),
      createPattern: () => ({}),
      
      // Canvas dimensions
      canvas: {
        width: 800,
        height: 600
      }
    };
  }
  return null;
};