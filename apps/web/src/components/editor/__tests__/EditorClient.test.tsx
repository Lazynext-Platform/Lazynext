import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditorClient from '../EditorClient';
import { EditorStateProvider } from '../useEditorState';

// Mock the Lucide React icons
jest.mock('lucide-react', () => ({
  Layers: () => <div data-testid="icon-layers" />,
  Volume2: () => <div data-testid="icon-volume2" />,
  Video: () => <div data-testid="icon-video" />,
  Type: () => <div data-testid="icon-type" />,
  ZoomIn: () => <div data-testid="icon-zoom-in" />,
  ZoomOut: () => <div data-testid="icon-zoom-out" />,
  Play: () => <div data-testid="icon-play" />,
  Pause: () => <div data-testid="icon-pause" />,
  SkipBack: () => <div data-testid="icon-skip-back" />,
  Scissors: () => <div data-testid="icon-scissors" />,
  MousePointer2: () => <div data-testid="icon-mouse-pointer2" />,
  Spline: () => <div data-testid="icon-spline" />,
  ArrowLeft: () => <div data-testid="icon-arrow-left" />,
  MoreHorizontal: () => <div data-testid="icon-more-horizontal" />,
  Settings2: () => <div data-testid="icon-settings" />,
  Download: () => <div data-testid="icon-download" />,
  MonitorPlay: () => <div data-testid="icon-monitor" />,
  Square: () => <div data-testid="icon-square" />,
  Plus: () => <div data-testid="icon-plus" />,
  Settings: () => <div data-testid="icon-settings" />,
  Maximize2: () => <div data-testid="icon-maximize" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Undo: () => <div data-testid="icon-undo" />,
  Redo: () => <div data-testid="icon-redo" />,
  Bot: () => <div data-testid="icon-bot" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Terminal: () => <div data-testid="icon-terminal" />,
  Send: () => <div data-testid="icon-send" />,
  X: () => <div data-testid="icon-x" />,
  Check: () => <div data-testid="icon-check" />,
}));

// Mock the child components to simplify testing
jest.mock('../timeline', () => ({ default: () => <div data-testid="timeline-component">Timeline Mock</div> }));
jest.mock('../wasm-player', () => ({ default: () => <div data-testid="wasm-player-component">Player Mock</div> }));

const mockProject = {
  id: "test-proj-1",
  name: "Test Project",
  fps: 60,
  width: 1920,
  height: 1080,
  duration_frames: 1000,
  tracks: []
};

describe('EditorClient Component', () => {
  it('renders the Editor without crashing', async () => {
    render(
      <EditorStateProvider>
        <EditorClient project={mockProject} />
      </EditorStateProvider>
    );
    
    // Check if the top bar renders the project name
    expect(await screen.findByDisplayValue('Test Project')).toBeInTheDocument();
    
    // Check if the timeline mock renders
    expect(screen.getByTestId('timeline-component')).toBeInTheDocument();
  });

  it('can toggle the God Mode correctly', () => {
    render(
      <EditorStateProvider>
        <EditorClient project={mockProject} />
      </EditorStateProvider>
    );
    
    // Find the God Mode toggle by role or text if possible. 
    // In EditorClient.tsx, it's a toggle button labeled "God Mode"
    const godModeBtn = screen.getAllByText(/God Mode/i)[0];
    expect(godModeBtn).toBeInTheDocument();
    
    fireEvent.click(godModeBtn);
    // Add assertions if there are UI changes based on God Mode
  });
});
