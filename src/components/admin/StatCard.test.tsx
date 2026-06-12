import { describe, expect, it, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { StatCard } from './StatCard';

describe('StatCard', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders the title and value correctly', () => {
    render(<StatCard title="Active Render Jobs" value="24" />);
    
    expect(screen.getByText('Active Render Jobs')).toBeTruthy();
    expect(screen.getByText('24')).toBeTruthy();
  });

  it('renders the trend indicator when provided', () => {
    render(<StatCard title="Total Users" value="1,248" trend="+12 today" />);
    
    expect(screen.getByText('+12 today')).toBeTruthy();
  });
});
